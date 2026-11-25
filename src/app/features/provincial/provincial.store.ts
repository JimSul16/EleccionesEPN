import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, shareReplay, startWith } from 'rxjs';

import { mensajeDeError } from '../../core/errores';
import { ActaRepository } from '../../data/acta.repository';
import { RecintoRepository } from '../../data/recinto.repository';
import { UsuarioRepository } from '../../data/usuario.repository';
import { lejosDelRecinto } from '../../domain/geo';
import { DIGNIDADES, type Acta, type Recinto, type Usuario } from '../../domain/models';

export interface AvanceRecinto {
  recinto: Recinto;
  coordinador: Usuario | null;
  actasRegistradas: number;
  actasEsperadas: number;
  porcentaje: number;
}

export interface PuntoActa {
  acta: Acta;
  recinto: Recinto | undefined;
  lejos: boolean;
}

type Vista<T> = { estado: 'cargando' } | { estado: 'error'; mensaje: string } | { estado: 'listo'; datos: T };

/**
 * Datos del coordinador provincial (R4): avance por recinto, ubicaciones de
 * las actas y las actas para los totales del dashboard, en tiempo real.
 *
 * Se provee por página (no en root): así las suscripciones a Firestore se
 * cierran al salir de la pantalla y no quedan vivas tras cerrar sesión.
 */
@Injectable()
export class ProvincialStore {
  private readonly recintos = inject(RecintoRepository);
  private readonly actas = inject(ActaRepository);
  private readonly usuarios = inject(UsuarioRepository);

  private readonly fuentes$ = combineLatest([
    this.recintos.todos$(),
    this.actas.todas$(),
    this.usuarios.coordinadores$(),
  ]).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly avance = toSignal(
    this.fuentes$.pipe(
      map(
        ([recintos, actas, coordinadores]): Vista<{
          filas: AvanceRecinto[];
          registradas: number;
          esperadas: number;
        }> => {
          const porCoordinador = new Map(coordinadores.map((c) => [c.uid, c]));
          const filas = recintos.map((recinto) => {
            const registradas = actas.filter((a) => a.recintoId === recinto.id).length;
            const esperadas = recinto.numJrv * DIGNIDADES.length;
            return {
              recinto,
              coordinador: recinto.coordinadorId ? (porCoordinador.get(recinto.coordinadorId) ?? null) : null,
              actasRegistradas: registradas,
              actasEsperadas: esperadas,
              porcentaje: esperadas ? Math.round((registradas / esperadas) * 100) : 0,
            };
          });
          return {
            estado: 'listo',
            datos: {
              filas,
              registradas: actas.length,
              esperadas: filas.reduce((s, f) => s + f.actasEsperadas, 0),
            },
          };
        },
      ),
      startWith({ estado: 'cargando' } as const),
      catchError((e) => of({ estado: 'error', mensaje: mensajeDeError(e) } as const)),
    ),
    { initialValue: { estado: 'cargando' } as const },
  );

  /** Actas con coordenadas, marcando las registradas lejos de su recinto. */
  readonly ubicaciones = toSignal(
    this.fuentes$.pipe(
      map(([recintos, actas]): Vista<PuntoActa[]> => {
        const porId = new Map(recintos.map((r) => [r.id, r]));
        const puntos = actas
          .filter((a) => a.ubicacion)
          .map((acta) => {
            const recinto = porId.get(acta.recintoId);
            const lejos =
              !!recinto?.lat &&
              !!recinto?.lng &&
              lejosDelRecinto(acta.ubicacion!, { lat: recinto.lat, lng: recinto.lng });
            return { acta, recinto, lejos };
          })
          .sort((a, b) => Number(b.lejos) - Number(a.lejos) || a.acta.id.localeCompare(b.acta.id));
        return { estado: 'listo', datos: puntos };
      }),
      startWith({ estado: 'cargando' } as const),
      catchError((e) => of({ estado: 'error', mensaje: mensajeDeError(e) } as const)),
    ),
    { initialValue: { estado: 'cargando' } as const },
  );

  /** Lista de recintos para filtros. */
  readonly listaRecintos = toSignal(
    this.fuentes$.pipe(
      map(([recintos]) => recintos),
      catchError(() => of([] as Recinto[])),
    ),
    { initialValue: [] as Recinto[] },
  );

  /** Actas en tiempo real; el dashboard suma sus votos (ver sumarActas). */
  readonly actasEnVivo = toSignal(
    this.fuentes$.pipe(
      map(([, actas]): Vista<Acta[]> => ({ estado: 'listo', datos: actas })),
      startWith({ estado: 'cargando' } as const),
      catchError((e) => of({ estado: 'error', mensaje: mensajeDeError(e) } as const)),
    ),
    { initialValue: { estado: 'cargando' } as const },
  );
}
