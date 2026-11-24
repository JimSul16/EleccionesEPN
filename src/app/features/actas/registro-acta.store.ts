import { computed, inject, Injectable, signal } from '@angular/core';

import { mensajeDeError } from '../../core/errores';
import { ActaRepository } from '../../data/acta.repository';
import { CatalogoRepository } from '../../data/catalogo.repository';
import { ColaFotosService } from '../../data/cola-fotos.service';
import { FotoError, FotoService, type FotoCapturada } from '../../data/foto.service';
import { JrvRepository } from '../../data/jrv.repository';
import { MENSAJES_UBICACION, UbicacionError, UbicacionService } from '../../data/ubicacion.service';
import { validarActa } from '../../domain/acta.rules';
import {
  ORGANIZACION_IDS,
  rutaFotoActa,
  type Acta,
  type Candidato,
  type ConteoActa,
  type Dignidad,
  type Jrv,
  type Organizacion,
  type Ubicacion,
} from '../../domain/models';

export interface FilaVotos {
  organizacion: Organizacion;
  candidato: Candidato | undefined;
}

export type EstadoCarga = 'cargando' | 'listo' | 'error';
export type EstadoGuardado = 'inactivo' | 'guardando' | 'guardado' | 'pendiente' | 'error';

const MENSAJES_FOTO: Record<string, string> = {
  permisoDenegado: 'Sin permiso de cámara. Actívelo en Ajustes > Aplicaciones > Control electoral > Permisos.',
  sinCamara: 'Este dispositivo no tiene cámara disponible.',
  fallo: 'No se pudo tomar la foto. Intente de nuevo.',
};

function uuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Lógica de registrar o corregir un acta (R6, R7), separada de la página (R9).
 * Se provee a nivel de componente: cada pantalla de acta tiene su propio estado.
 */
@Injectable()
export class RegistroActaStore {
  private readonly actas = inject(ActaRepository);
  private readonly catalogo = inject(CatalogoRepository);
  private readonly jrvs = inject(JrvRepository);
  private readonly fotoSrv = inject(FotoService);
  private readonly colaFotos = inject(ColaFotosService);
  private readonly ubicacionSrv = inject(UbicacionService);

  readonly carga = signal<EstadoCarga>('cargando');
  readonly errorCarga = signal<string | null>(null);
  readonly jrv = signal<Jrv | null>(null);
  readonly dignidad = signal<Dignidad>('ALCALDE');
  readonly filas = signal<FilaVotos[]>([]);
  readonly anterior = signal<Acta | null>(null);

  readonly foto = signal<FotoCapturada | null>(null);
  readonly urlFotoAnterior = signal<string | null>(null);
  readonly tomandoFoto = signal(false);
  readonly errorFoto = signal<string | null>(null);

  readonly ubicacion = signal<Ubicacion | null>(null);
  readonly obteniendoUbicacion = signal(false);
  readonly errorUbicacion = signal<string | null>(null);

  readonly guardado = signal<EstadoGuardado>('inactivo');
  readonly errorGuardado = signal<string | null>(null);

  readonly esCorreccion = computed(() => this.anterior() !== null);
  /** Hay foto válida: una nueva y nítida, o la que ya tenía el acta. */
  readonly tieneFoto = computed(() => (this.foto()?.nitida ?? false) || (!this.foto() && !!this.anterior()?.fotoPath));

  async cargar(jrvId: string, dignidad: Dignidad): Promise<void> {
    this.carga.set('cargando');
    this.dignidad.set(dignidad);
    try {
      const [jrv, organizaciones, candidatos, anterior] = await Promise.all([
        this.jrvs.obtener(jrvId),
        this.catalogo.organizaciones(),
        this.catalogo.candidatos(dignidad),
        this.actas.obtener(jrvId, dignidad),
      ]);
      if (!jrv) throw new Error('No tiene acceso a esta mesa.');
      this.jrv.set(jrv);
      this.anterior.set(anterior);
      this.ubicacion.set(anterior?.ubicacion ?? null);
      this.filas.set(
        organizaciones.map((o) => ({ organizacion: o, candidato: candidatos.find((c) => c.organizacionId === o.id) })),
      );
      if (anterior?.fotoPath) {
        this.fotoSrv.url(anterior.fotoPath).then(
          (u) => this.urlFotoAnterior.set(u),
          () => this.urlFotoAnterior.set(null), // Puede estar aún en la cola offline.
        );
      }
      this.carga.set('listo');
    } catch (e) {
      this.errorCarga.set(e instanceof Error && !('code' in e) ? e.message : mensajeDeError(e));
      this.carga.set('error');
    }
  }

  /** Valores iniciales del formulario (los del acta si es una corrección). */
  valoresIniciales(): Record<string, number | null> {
    const a = this.anterior();
    const v: Record<string, number | null> = {};
    for (const o of ORGANIZACION_IDS) v[o] = a ? a.votos[o] : null;
    v['nulos'] = a?.nulos ?? null;
    v['blancos'] = a?.blancos ?? null;
    v['totalSufragantes'] = a?.totalSufragantes ?? null;
    return v;
  }

  async tomarFoto(): Promise<void> {
    this.tomandoFoto.set(true);
    this.errorFoto.set(null);
    try {
      const nueva = await this.fotoSrv.capturar();
      this.descartarFoto();
      this.foto.set(nueva);
      if (!nueva.nitida)
        this.errorFoto.set('La foto está borrosa. Sostenga el teléfono firme, con buena luz, y repítala.');
    } catch (e) {
      if (e instanceof FotoError && e.tipo === 'cancelada') return;
      this.errorFoto.set(MENSAJES_FOTO[e instanceof FotoError ? e.tipo : 'fallo']);
    } finally {
      this.tomandoFoto.set(false);
    }
  }

  descartarFoto(): void {
    const f = this.foto();
    if (f) URL.revokeObjectURL(f.vistaPrevia);
    this.foto.set(null);
  }

  async obtenerUbicacion(): Promise<void> {
    this.obteniendoUbicacion.set(true);
    this.errorUbicacion.set(null);
    try {
      this.ubicacion.set(await this.ubicacionSrv.obtener());
    } catch (e) {
      this.errorUbicacion.set(MENSAJES_UBICACION[e instanceof UbicacionError ? e.tipo : 'fallo']);
    } finally {
      this.obteniendoUbicacion.set(false);
    }
  }

  /** Motivos por los que todavía no se puede guardar (además de la validación de totales). */
  faltantes(): string[] {
    const f: string[] = [];
    if (!this.tieneFoto()) f.push('Tome una foto nítida del acta.');
    if (!this.ubicacion()) f.push('Registre la ubicación GPS.');
    return f;
  }

  async guardar(conteo: ConteoActa): Promise<void> {
    const jrv = this.jrv();
    if (!jrv || this.guardado() === 'guardando') return;
    if (!validarActa(conteo).valida || this.faltantes().length > 0) return;

    this.guardado.set('guardando');
    this.errorGuardado.set(null);
    try {
      let fotoPath = this.anterior()?.fotoPath ?? null;
      let fotoEnCola = false;
      const nueva = this.foto();
      if (nueva) {
        fotoPath = rutaFotoActa(jrv.recintoId, jrv.id, this.dignidad(), uuid());
        fotoEnCola = !(await this.colaFotos.subirOEncolar(fotoPath, nueva.blob));
      }

      const r = await this.actas.guardar(
        {
          ...conteo,
          jrvId: jrv.id,
          recintoId: jrv.recintoId,
          dignidad: this.dignidad(),
          fotoPath,
          ubicacion: this.ubicacion(),
        },
        this.anterior(),
      );

      if (r.sincronizada && !fotoEnCola) {
        this.guardado.set('guardado');
      } else {
        this.guardado.set('pendiente');
        // Cuando vuelva la red, Firestore envía la escritura. Si las reglas la rechazan
        // (por ejemplo, un coordinador corrigió el acta antes: conflicto de versión),
        // se informa; en ese caso gana la versión del servidor.
        r.confirmacion.then(
          () => {
            if (this.guardado() === 'pendiente' && !fotoEnCola) this.guardado.set('guardado');
          },
          (e) => {
            this.guardado.set('error');
            this.errorGuardado.set(
              (e as { code?: string }).code === 'permission-denied'
                ? 'El acta fue modificada por otra persona o su mesa fue reasignada. Revise la versión actual.'
                : mensajeDeError(e),
            );
          },
        );
      }
    } catch (e) {
      this.guardado.set('error');
      this.errorGuardado.set(mensajeDeError(e));
    }
  }
}
