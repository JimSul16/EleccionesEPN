import { inject, Injectable } from '@angular/core';
import {
  collection,
  count,
  doc,
  getAggregateFromServer,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  sum,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Query,
} from 'firebase/firestore';
import { Observable } from 'rxjs';

import { FirebaseService } from '../core/firebase';
import {
  actaId,
  ORGANIZACION_IDS,
  rutaFotoActa,
  type Acta,
  type ConteoActa,
  type Dignidad,
  type Ubicacion,
  type Votos,
} from '../domain/models';

export interface DatosActa extends ConteoActa {
  jrvId: string;
  recintoId: string;
  dignidad: Dignidad;
  /** Foto actual del acta (fotos/{id}), o null. Se reemplaza si se pasa una FotoNueva. */
  fotoPath: string | null;
  ubicacion: Ubicacion | null;
}

/** Foto nueva tomada para el acta, ya comprimida (ver FotoService). */
export interface FotoNueva {
  uuid: string;
  base64: string;
  bytes: number;
}

/**
 * Resultado de guardar. Con red, `sincronizada` es true. Sin red, Firestore deja
 * la escritura en su cola local (IndexedDB) y la envía al reconectar (R10):
 * `confirmacion` se resuelve entonces, o se rechaza si las reglas la niegan
 * (por ejemplo un conflicto de versión).
 */
export interface ResultadoGuardado {
  sincronizada: boolean;
  confirmacion: Promise<void>;
}

/** Totales del dashboard (R4). */
export interface TotalesVotos {
  actas: number;
  votos: Votos;
  nulos: number;
  blancos: number;
  totalSufragantes: number;
}

const ESPERA_SERVIDOR_MS = 4000;

function aActa(s: DocumentSnapshot): Acta | null {
  if (!s.exists()) return null;
  const d = s.data();
  return {
    id: s.id,
    jrvId: d['jrvId'],
    recintoId: d['recintoId'],
    dignidad: d['dignidad'],
    votos: d['votos'],
    nulos: d['nulos'],
    blancos: d['blancos'],
    totalSufragantes: d['totalSufragantes'],
    fotoPath: d['fotoPath'] ?? null,
    ubicacion: d['ubicacion'] ?? null,
    estado: d['estado'],
    version: d['version'],
    registradoPor: d['registradoPor'],
    updatedBy: d['updatedBy'],
  };
}

@Injectable({ providedIn: 'root' })
export class ActaRepository {
  private readonly fb = inject(FirebaseService);

  /**
   * Acta de una mesa y dignidad, en tiempo real. Se lee por ID: así la regla puede
   * comprobar que la mesa es del veedor (las consultas de lista no lo permitirían).
   */
  acta$(jrvId: string, dignidad: Dignidad): Observable<Acta | null> {
    return new Observable((sub) =>
      onSnapshot(
        doc(this.fb.db, 'actas', actaId(jrvId, dignidad)),
        (s) => sub.next(aActa(s)),
        (e) => sub.error(e),
      ),
    );
  }

  async obtener(jrvId: string, dignidad: Dignidad): Promise<Acta | null> {
    return aActa(await getDoc(doc(this.fb.db, 'actas', actaId(jrvId, dignidad))));
  }

  /** Actas de un recinto (coordinador de recinto y provincial). */
  delRecinto$(recintoId: string): Observable<Acta[]> {
    return this.escuchar(query(collection(this.fb.db, 'actas'), where('recintoId', '==', recintoId)));
  }

  /** Todas las actas (solo el provincial puede listarlas). */
  todas$(): Observable<Acta[]> {
    return this.escuchar(collection(this.fb.db, 'actas'));
  }

  /**
   * Crea el acta (versión 1) o la corrige (versión + 1), con su foto nueva (si la
   * hay) y su registro de auditoría, en un solo lote atómico. Sin red, Firestore
   * encola el lote completo y lo envía al reconectar (R10). La versión esperada se
   * comprueba en las reglas: si otro corrigió antes, el lote se rechaza.
   */
  async guardar(datos: DatosActa, anterior: Acta | null, foto?: FotoNueva): Promise<ResultadoGuardado> {
    const uid = this.fb.auth.currentUser?.uid;
    if (!uid) throw new Error('Sin sesión');
    const id = actaId(datos.jrvId, datos.dignidad);
    const ref = doc(this.fb.db, 'actas', id);
    const version = anterior ? anterior.version + 1 : 1;
    const fotoPath = foto ? rutaFotoActa(id, foto.uuid) : datos.fotoPath;

    const conteo = {
      votos: Object.fromEntries(ORGANIZACION_IDS.map((o) => [o, Number(datos.votos[o])])),
      nulos: Number(datos.nulos),
      blancos: Number(datos.blancos),
      totalSufragantes: Number(datos.totalSufragantes),
      fotoPath,
      ubicacion: datos.ubicacion,
    };

    const lote = writeBatch(this.fb.db);
    if (foto) {
      lote.set(doc(this.fb.db, fotoPath!), {
        actaId: id,
        jrvId: datos.jrvId,
        recintoId: datos.recintoId,
        dignidad: datos.dignidad,
        mime: 'image/jpeg',
        imagen: foto.base64,
        bytes: foto.bytes,
        creadoPor: uid,
        creadoEn: serverTimestamp(),
      });
    }
    if (anterior) {
      lote.update(ref, { ...conteo, estado: 'CORREGIDA', version, updatedBy: uid, updatedAt: serverTimestamp() });
    } else {
      lote.set(ref, {
        ...conteo,
        jrvId: datos.jrvId,
        recintoId: datos.recintoId,
        dignidad: datos.dignidad,
        estado: 'REGISTRADA',
        version,
        registradoPor: uid,
        updatedBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    // Auditoría (R5, R6): las reglas exigen que vaya en el mismo lote que el acta.
    lote.set(doc(collection(this.fb.db, 'auditoria')), {
      actaId: id,
      recintoId: datos.recintoId,
      usuario: uid,
      accion: anterior ? 'CORREGIR' : 'CREAR',
      version,
      antes: anterior
        ? {
            votos: anterior.votos,
            nulos: anterior.nulos,
            blancos: anterior.blancos,
            totalSufragantes: anterior.totalSufragantes,
            fotoPath: anterior.fotoPath,
          }
        : null,
      despues: conteo,
      fecha: serverTimestamp(),
    });

    const escritura = lote.commit();
    const plazo = new Promise<'pendiente'>((r) => setTimeout(() => r('pendiente'), ESPERA_SERVIDOR_MS));
    const primero = await Promise.race([escritura.then(() => 'ok' as const), plazo]);
    return { sincronizada: primero === 'ok', confirmacion: escritura };
  }

  /** Imagen de una foto de acta como data URL, o null si no existe o no está disponible. */
  async imagen(fotoPath: string): Promise<string | null> {
    const s = await getDoc(doc(this.fb.db, fotoPath));
    return s.exists() ? `data:${s.get('mime')};base64,${s.get('imagen')}` : null;
  }

  /**
   * Suma de votos por organización para una dignidad, consolidado o por recinto.
   * Se calcula en el servidor (consulta de agregación), no descargando las actas.
   * Firestore admite como máximo 5 agregaciones por consulta, por eso son dos
   * consultas en paralelo sobre el mismo filtro.
   */
  async totales(dignidad: Dignidad, recintoId?: string): Promise<TotalesVotos> {
    const filtros = [where('dignidad', '==', dignidad)];
    if (recintoId) filtros.push(where('recintoId', '==', recintoId));
    const q = query(collection(this.fb.db, 'actas'), ...filtros);
    const [a, b] = await Promise.all([
      getAggregateFromServer(q, {
        actas: count(),
        o1: sum('votos.o1'),
        o2: sum('votos.o2'),
        o3: sum('votos.o3'),
        o4: sum('votos.o4'),
      }),
      getAggregateFromServer(q, {
        o5: sum('votos.o5'),
        nulos: sum('nulos'),
        blancos: sum('blancos'),
        totalSufragantes: sum('totalSufragantes'),
      }),
    ]);
    const x = a.data();
    const y = b.data();
    return {
      actas: x.actas,
      votos: { o1: x.o1, o2: x.o2, o3: x.o3, o4: x.o4, o5: y.o5 },
      nulos: y.nulos,
      blancos: y.blancos,
      totalSufragantes: y.totalSufragantes,
    };
  }

  private escuchar(q: Query): Observable<Acta[]> {
    return new Observable((sub) =>
      onSnapshot(
        q,
        (s) => sub.next(s.docs.map((d) => aActa(d)).filter((a): a is Acta => a !== null)),
        (e) => sub.error(e),
      ),
    );
  }
}
