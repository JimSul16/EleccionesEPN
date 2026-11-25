import { inject, Injectable } from '@angular/core';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { Observable } from 'rxjs';

import { ErrorParaUsuario } from '../core/errores';
import { FirebaseService } from '../core/firebase';
import { esCedulaValida } from '../domain/cedula.validator';
import type { Rol, Usuario } from '../domain/models';
import { esEmailValido, esTelefonoValido, PASSWORD_INICIAL } from '../domain/usuario.rules';

export interface NuevoUsuario {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  rol: Extract<Rol, 'RECINTO' | 'VEEDOR'>;
  /** Solo al crear un coordinador de recinto. Para un veedor se usa el recinto del creador. */
  recintoId?: string;
}

/**
 * Usuarios (R2). Plan gratuito Spark (ADR-018): la cuenta la crea la app del
 * coordinador con una instancia secundaria de Firebase Auth, y el perfil se
 * escribe en un lote que firestore.rules valida (jerarquía, recinto, cédula
 * única). Sin perfil, una cuenta de Auth no tiene ningún permiso.
 */
@Injectable({ providedIn: 'root' })
export class UsuarioRepository {
  private readonly fb = inject(FirebaseService);

  async crear(datos: NuevoUsuario): Promise<{ uid: string; correoEnviado: boolean }> {
    const creador = this.fb.auth.currentUser;
    if (!creador) throw new ErrorParaUsuario('Su sesión expiró. Ingrese de nuevo.');

    const cedula = datos.cedula.trim();
    const email = datos.email.trim().toLowerCase();
    const telefono = datos.telefono.trim();
    if (!esCedulaValida(cedula)) throw new ErrorParaUsuario('Cédula no válida.');
    if (!esEmailValido(email)) throw new ErrorParaUsuario('Correo no válido.');
    if (!esTelefonoValido(telefono)) throw new ErrorParaUsuario('Teléfono no válido (09XXXXXXXX).');

    const recintoId =
      datos.rol === 'VEEDOR'
        ? ((await getDoc(doc(this.fb.db, 'usuarios', creador.uid))).get('recintoId') as string | null)
        : datos.recintoId;
    if (!recintoId) throw new ErrorParaUsuario('Falta el recinto.');

    if ((await getDoc(doc(this.fb.db, 'cedulas', cedula))).exists()) {
      throw new ErrorParaUsuario('Ya existe una cuenta con esa cédula.');
    }

    const secundaria = this.fb.crearAuthSecundaria();
    try {
      const nueva = (await createUserWithEmailAndPassword(secundaria.auth, email, PASSWORD_INICIAL)).user;

      const lote = writeBatch(this.fb.db);
      lote.set(doc(this.fb.db, 'usuarios', nueva.uid), {
        cedula,
        nombres: datos.nombres.trim(),
        apellidos: datos.apellidos.trim(),
        telefono,
        email,
        rol: datos.rol,
        recintoId,
        debeCambiarPassword: true,
        creadoPor: creador.uid,
        creadoEn: serverTimestamp(),
      });
      lote.set(doc(this.fb.db, 'cedulas', cedula), { uid: nueva.uid, email });
      if (datos.rol === 'RECINTO') lote.update(doc(this.fb.db, 'recintos', recintoId), { coordinadorId: nueva.uid });

      try {
        await lote.commit();
      } catch (e) {
        // Las reglas rechazaron el perfil (jerarquía, recinto con coordinador, cédula
        // tomada en paralelo): se borra la cuenta recién creada para no dejarla huérfana.
        await nueva.delete().catch(() => undefined);
        if ((e as { code?: string }).code === 'permission-denied') {
          throw new ErrorParaUsuario(
            datos.rol === 'RECINTO'
              ? 'No se pudo crear: el recinto ya tiene coordinador o su rol no lo permite.'
              : 'No se pudo crear: su rol no lo permite o la cédula ya está registrada.',
          );
        }
        throw e;
      }

      // Confirmación de cuenta (R2). Si falla, la cuenta igual queda creada.
      const correoEnviado = await sendEmailVerification(nueva).then(
        () => true,
        () => false,
      );
      return { uid: nueva.uid, correoEnviado };
    } finally {
      await secundaria.cerrar();
    }
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
