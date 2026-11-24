import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith, switchMap, type Observable } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { mensajeDeError } from '../../core/errores';
import { ActaRepository } from '../../data/acta.repository';
import { JrvRepository } from '../../data/jrv.repository';
import { DIGNIDADES, type Acta, type Dignidad, type Jrv } from '../../domain/models';

export interface MesaDelVeedor {
  jrv: Jrv;
  actas: Record<Dignidad, Acta | null>;
  completas: number;
}

export type VistaMesas =
  { estado: 'cargando' } | { estado: 'error'; mensaje: string } | { estado: 'listo'; mesas: MesaDelVeedor[] };

/** Mesas asignadas al veedor con el estado de sus dos actas, en tiempo real (R6). */
@Injectable()
export class MisMesasStore {
  private readonly auth = inject(AuthService);
  private readonly jrvs = inject(JrvRepository);
  private readonly actas = inject(ActaRepository);

  private readonly vista$: Observable<VistaMesas> = this.jrvs.delVeedor$(this.auth.usuario()?.uid ?? '').pipe(
    switchMap((mesas) =>
      mesas.length === 0
        ? of<MesaDelVeedor[]>([])
        : combineLatest(
            mesas.map((jrv) =>
              combineLatest(DIGNIDADES.map((d) => this.actas.acta$(jrv.id, d))).pipe(
                map(([alcalde, prefecto]) => ({
                  jrv,
                  actas: { ALCALDE: alcalde, PREFECTO: prefecto },
                  completas: [alcalde, prefecto].filter(Boolean).length,
                })),
              ),
            ),
          ),
    ),
    map((mesas): VistaMesas => ({ estado: 'listo', mesas })),
    startWith<VistaMesas>({ estado: 'cargando' }),
    catchError((e) => of<VistaMesas>({ estado: 'error', mensaje: mensajeDeError(e) })),
  );

  readonly vista = toSignal(this.vista$, { initialValue: { estado: 'cargando' } as VistaMesas });
}
