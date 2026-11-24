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
  setDoc,
  sum,
  updateDoc,
  where,
  type DocumentSnapshot,
  type Query,
} from 'firebase/firestore';
import { Observable } from 'rxjs';

import { FirebaseService } from '../core/firebase';
import {
  actaId,
  ORGANIZACION_IDS,
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
  fotoPath: string | null;
  ubicacion: Ubicacion | null;
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
   * Crea el acta (versión 1) o la corrige (versión + 1). La versión esperada se
   * comprueba en las reglas: si otro la corrigió antes, la escritura se rechaza.
   */
  async guardar(datos: DatosActa, anterior: Acta | null): Promise<ResultadoGuardado> {
    const uid = this.fb.auth.currentUser?.uid;
    if (!uid) throw new Error('Sin sesión');
    const ref = doc(this.fb.db, 'actas', actaId(datos.jrvId, datos.dignidad));
    const conteo = {
      votos: Object.fromEntries(ORGANIZACION_IDS.map((o) => [o, Number(datos.votos[o])])),
      nulos: Number(datos.nulos),
      blancos: Number(datos.blancos),
      totalSufragantes: Number(datos.totalSufragantes),
      fotoPath: datos.fotoPath,
      ubicacion: datos.ubicacion,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    };

    const escritura = anterior
      ? updateDoc(ref, { ...conteo, estado: 'CORREGIDA', version: anterior.version + 1 })
      : setDoc(ref, {
          ...conteo,
          jrvId: datos.jrvId,
          recintoId: datos.recintoId,
          dignidad: datos.dignidad,
          estado: 'REGISTRADA',
          version: 1,
          registradoPor: uid,
          createdAt: serverTimestamp(),
        });

    const plazo = new Promise<'pendiente'>((r) => setTimeout(() => r('pendiente'), ESPERA_SERVIDOR_MS));
    const primero = await Promise.race([escritura.then(() => 'ok' as const), plazo]);
    return { sincronizada: primero === 'ok', confirmacion: escritura };
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
