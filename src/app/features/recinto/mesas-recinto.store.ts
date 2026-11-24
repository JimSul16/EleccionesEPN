import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { mensajeDeError } from '../../core/errores';
import { ActaRepository } from '../../data/acta.repository';
import { JrvRepository } from '../../data/jrv.repository';
import { RecintoRepository } from '../../data/recinto.repository';
import { UsuarioRepository } from '../../data/usuario.repository';
import { estadoMesa, type Acta, type Dignidad, type EstadoMesa, type Jrv, type Usuario } from '../../domain/models';

export interface FilaMesa {
  jrv: Jrv;
  estado: EstadoMesa;
  veedor: Usuario | null;
  actas: Partial<Record<Dignidad, Acta>>;
}

type Vista =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; filas: FilaMesa[]; veedores: Usuario[] };

/**
 * Mesas del recinto del coordinador con su estado, veedor y actas, en tiempo
 * real (R5). Une tres consultas filtradas por recintoId, como exigen las reglas.
 */
@Injectable()
export class MesasRecintoStore {
  private readonly auth = inject(AuthService);
  private readonly jrvs = inject(JrvRepository);
  private readonly actas = inject(ActaRepository);
  private readonly usuarios = inject(UsuarioRepository);
  private readonly recintos = inject(RecintoRepository);

  readonly recintoId = this.auth.usuario()?.recintoId ?? '';
  readonly nombreRecinto = signal<string>('');
  readonly asignando = signal<string | null>(null);
  readonly errorAsignacion = signal<string | null>(null);

  readonly vista = toSignal(
    combineLatest([
      this.jrvs.delRecinto$(this.recintoId),
      this.actas.delRecinto$(this.recintoId),
      this.usuarios.veedoresDelRecinto$(this.recintoId),
    ]).pipe(
      map(([mesas, actas, veedores]): Vista => {
        const porVeedor = new Map(veedores.map((v) => [v.uid, v]));
        const filas = mesas.map((jrv) => {
          const propias = actas.filter((a) => a.jrvId === jrv.id);
          return {
            jrv,
            estado: estadoMesa(jrv.veedorId, propias.length),
            veedor: jrv.veedorId ? (porVeedor.get(jrv.veedorId) ?? null) : null,
            actas: Object.fromEntries(propias.map((a) => [a.dignidad, a])),
          };
        });
        return { estado: 'listo', filas, veedores };
      }),
      startWith<Vista>({ estado: 'cargando' }),
      catchError((e) => of<Vista>({ estado: 'error', mensaje: mensajeDeError(e) })),
    ),
    { initialValue: { estado: 'cargando' } as Vista },
  );

  /** Resumen del avance del recinto: mesas completas sobre el total. */
  readonly avance = computed(() => {
    const v = this.vista();
    if (v.estado !== 'listo') return null;
    const completas = v.filas.filter((f) => f.estado === 'COMPLETA').length;
    return { completas, total: v.filas.length };
  });

  constructor() {
    void this.recintos.obtener(this.recintoId).then((r) => this.nombreRecinto.set(r?.nombre ?? ''));
  }

  async asignar(jrvId: string, veedorId: string | null): Promise<void> {
    this.asignando.set(jrvId);
    this.errorAsignacion.set(null);
    try {
      await this.jrvs.asignarVeedor(jrvId, veedorId);
    } catch (e) {
      this.errorAsignacion.set(mensajeDeError(e));
    } finally {
      this.asignando.set(null);
    }
  }
}
