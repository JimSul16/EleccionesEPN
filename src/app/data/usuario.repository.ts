import { inject, Injectable } from '@angular/core';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Observable } from 'rxjs';

import { FirebaseService } from '../core/firebase';
import type { Rol, Usuario } from '../domain/models';

export interface NuevoUsuario {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  rol: Extract<Rol, 'RECINTO' | 'VEEDOR'>;
  /** Solo al crear un coordinador de recinto. */
  recintoId?: string;
}

/** Usuarios. La creación pasa por la Function crearUsuario (R2): la app no puede crear cuentas. */
@Injectable({ providedIn: 'root' })
export class UsuarioRepository {
  private readonly fb = inject(FirebaseService);

  async crear(datos: NuevoUsuario): Promise<{ uid: string; correoEnviado: boolean }> {
    const llamar = httpsCallable<NuevoUsuario, { uid: string; correoEnviado: boolean }>(
      this.fb.functions,
      'crearUsuario',
    );
    return (await llamar({ ...datos, cedula: datos.cedula.trim(), email: datos.email.trim() })).data;
  }

  /** Veedores de un recinto, para asignarlos a mesas (R5). */
  veedoresDelRecinto$(recintoId: string): Observable<Usuario[]> {
    const q = query(
      collection(this.fb.db, 'usuarios'),
      where('recintoId', '==', recintoId),
      where('rol', '==', 'VEEDOR'),
    );
    return new Observable((sub) =>
      onSnapshot(
        q,
        (s) =>
          sub.next(
            s.docs
              .map((d) => ({ uid: d.id, ...(d.data() as Omit<Usuario, 'uid'>) }))
              .sort((a, b) => a.apellidos.localeCompare(b.apellidos)),
          ),
        (e) => sub.error(e),
      ),
    );
  }

  /** Coordinadores de recinto (para que el provincial vea quién está asignado). */
  coordinadores$(): Observable<Usuario[]> {
    const q = query(collection(this.fb.db, 'usuarios'), where('rol', '==', 'RECINTO'));
    return new Observable((sub) =>
      onSnapshot(
        q,
        (s) => sub.next(s.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Usuario, 'uid'>) }))),
        (e) => sub.error(e),
      ),
    );
  }
}
