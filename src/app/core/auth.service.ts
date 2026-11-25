import { computed, inject, Injectable, signal } from '@angular/core';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { esCedulaValida } from '../domain/cedula.validator';
import type { Rol, Usuario } from '../domain/models';
import { MENSAJES_PASSWORD, validarPasswordNueva } from '../domain/usuario.rules';

import { ErrorParaUsuario } from './errores';
import { FirebaseService } from './firebase';

/** Error de acceso con un mensaje para mostrar tal cual al usuario. */
export class ErrorDeAcceso extends ErrorParaUsuario {}

export const CREDENCIALES_INCORRECTAS = 'Cédula o contraseña incorrecta.';
export const MENSAJE_RECUPERACION = 'Si la cédula está registrada, se envió un correo para restablecer la contraseña.';

/**
 * Sesión con signals (ADR-006). Plan gratuito Spark (ADR-018): sin Cloud
 * Functions, todo con el SDK de Firebase Auth y las reglas de Firestore.
 * - Login por cédula: cedulas/{cédula} da el correo y se inicia sesión con él.
 * - El rol y el recinto salen del perfil usuarios/{uid} (lo mismo que leen las reglas).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly fb = inject(FirebaseService);

  private readonly _usuario = signal<Usuario | null>(null);
  private readonly _listo = signal(false);

  /** Perfil del usuario autenticado o null. */
  readonly usuario = this._usuario.asReadonly();
  /** false hasta conocer el primer estado de sesión (los guards lo esperan). */
  readonly listo = this._listo.asReadonly();
  readonly rol = computed<Rol | null>(() => this._usuario()?.rol ?? null);
  readonly autenticado = computed(() => this._usuario() !== null);

  private readonly primerEstado: Promise<void>;

  constructor() {
    this.primerEstado = new Promise((resolve) => {
      onAuthStateChanged(this.fb.auth, async (user) => {
        try {
          this._usuario.set(user ? await this.cargarPerfil(user) : null);
        } catch {
          // Sin perfil (cuenta no creada por un coordinador) o sin red y sin caché:
          // se trata como sin sesión.
          this._usuario.set(null);
        } finally {
          this._listo.set(true);
          resolve();
        }
      });
    });
  }

  /** Espera a que Firebase restaure (o no) la sesión guardada. */
  esperarListo(): Promise<void> {
    return this.primerEstado;
  }

  /** Login con la cédula como identificador visible (R3). Error siempre genérico. */
  async login(cedula: string, password: string): Promise<Usuario> {
    const email = await this.emailDeCedula(cedula);
    if (!email || !password) throw new ErrorDeAcceso(CREDENCIALES_INCORRECTAS);
    let user: User;
    try {
      user = (await signInWithEmailAndPassword(this.fb.auth, email, password)).user;
    } catch (e) {
      const codigo = (e as { code?: string }).code ?? '';
      if (codigo === 'auth/too-many-requests') {
        throw new ErrorDeAcceso('Demasiados intentos. Espere unos minutos e intente de nuevo.');
      }
      if (codigo === 'auth/network-request-failed') throw e;
      throw new ErrorDeAcceso(CREDENCIALES_INCORRECTAS);
    }
    try {
      const perfil = await this.cargarPerfil(user);
      this._usuario.set(perfil);
      return perfil;
    } catch {
      await signOut(this.fb.auth);
      throw new ErrorDeAcceso('La cuenta no tiene un perfil asignado. Consulte a su coordinador.');
    }
  }

  async logout(): Promise<void> {
    await signOut(this.fb.auth);
    this._usuario.set(null);
  }

  /** Cambio obligatorio en el primer acceso (R3). La política se valida aquí y en Firebase Auth. */
  async cambiarPassword(nueva: string): Promise<void> {
    const user = this.fb.auth.currentUser;
    const actual = this._usuario();
    if (!user || !actual) throw new ErrorDeAcceso('Su sesión expiró. Ingrese de nuevo.');
    const errores = validarPasswordNueva(nueva);
    if (errores.length > 0) throw new ErrorDeAcceso(errores.map((e) => MENSAJES_PASSWORD[e]).join(' '));
    try {
      await updatePassword(user, nueva);
    } catch (e) {
      if ((e as { code?: string }).code === 'auth/requires-recent-login') {
        throw new ErrorDeAcceso('Por seguridad, cierre sesión e ingrese de nuevo antes de cambiar la contraseña.');
      }
      throw e;
    }
    await updateDoc(doc(this.fb.db, 'usuarios', user.uid), {
      debeCambiarPassword: false,
      passwordCambiadaEn: serverTimestamp(),
    });
    this._usuario.set({ ...actual, debeCambiarPassword: false });
  }

  /** Recuperación por correo (R3): la respuesta es la misma exista o no la cédula. */
  async recuperarPassword(cedula: string): Promise<string> {
    try {
      const email = await this.emailDeCedula(cedula);
      if (email) await sendPasswordResetEmail(this.fb.auth, email);
    } catch (e) {
      // Sin red sí se informa; cualquier otro error se oculta para no revelar qué cédulas existen.
      if ((e as { code?: string }).code === 'auth/network-request-failed') throw e;
    }
    return MENSAJE_RECUPERACION;
  }

  /** Ruta de inicio según el rol. */
  inicioPorRol(rol: Rol | null = this.rol()): string {
    switch (rol) {
      case 'PROVINCIAL':
        return '/provincial';
      case 'RECINTO':
        return '/recinto';
      case 'VEEDOR':
        return '/veedor';
      default:
        return '/login';
    }
  }

  /** Correo asociado a una cédula (cedulas/{cédula}), o null. */
  private async emailDeCedula(cedula: string): Promise<string | null> {
    const limpia = cedula.trim();
    if (!esCedulaValida(limpia)) return null;
    const snap = await getDoc(doc(this.fb.db, 'cedulas', limpia));
    return snap.exists() ? (snap.get('email') as string) : null;
  }

  private async cargarPerfil(user: User): Promise<Usuario> {
    const snap = await getDoc(doc(this.fb.db, 'usuarios', user.uid));
    if (!snap.exists()) throw new Error('Perfil no encontrado');
    const d = snap.data();
    return {
      uid: user.uid,
      cedula: d['cedula'],
      nombres: d['nombres'],
      apellidos: d['apellidos'],
      telefono: d['telefono'],
      email: d['email'],
      rol: d['rol'] as Rol,
      recintoId: (d['recintoId'] as string | null | undefined) ?? null,
      debeCambiarPassword: d['debeCambiarPassword'] === true,
    };
  }
}
