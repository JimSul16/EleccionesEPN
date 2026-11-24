import { computed, inject, Injectable, signal } from '@angular/core';
import { onAuthStateChanged, signInWithCustomToken, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import type { Rol, Usuario } from '../domain/models';

import { FirebaseService } from './firebase';

/**
 * Estado de sesión con signals (ADR-006). Expone el perfil del usuario y su rol;
 * las acciones privilegiadas (login por cédula, cambio de contraseña,
 * recuperación) pasan por Cloud Functions.
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
          // Perfil inaccesible (por ejemplo sin red y sin caché): se trata como sin sesión.
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

  async login(cedula: string, password: string): Promise<Usuario> {
    const llamar = httpsCallable<{ cedula: string; password: string }, { token: string }>(
      this.fb.functions,
      'loginCedula',
    );
    const { data } = await llamar({ cedula: cedula.trim(), password });
    const credencial = await signInWithCustomToken(this.fb.auth, data.token);
    const perfil = await this.cargarPerfil(credencial.user);
    this._usuario.set(perfil);
    return perfil;
  }

  async logout(): Promise<void> {
    await signOut(this.fb.auth);
    this._usuario.set(null);
  }

  /**
   * Cambio obligatorio en el primer acceso. Cambiar la contraseña revoca las
   * sesiones del usuario, así que se vuelve a iniciar sesión con la nueva.
   */
  async cambiarPassword(nueva: string): Promise<void> {
    const actual = this._usuario();
    if (!actual) throw new Error('Sin sesión');
    const llamar = httpsCallable<{ nueva: string }, { ok: boolean }>(this.fb.functions, 'cambiarPassword');
    await llamar({ nueva });
    await this.login(actual.cedula, nueva);
  }

  async recuperarPassword(cedula: string): Promise<string> {
    const llamar = httpsCallable<{ cedula: string }, { mensaje: string }>(this.fb.functions, 'recuperarPassword');
    const { data } = await llamar({ cedula: cedula.trim() });
    return data.mensaje;
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

  private async cargarPerfil(user: User): Promise<Usuario> {
    // El rol se toma de los custom claims (lo que también ven las reglas) y no del documento.
    const token = await user.getIdTokenResult();
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
      rol: token.claims['rol'] as Rol,
      recintoId: (token.claims['recintoId'] as string | undefined) ?? null,
      debeCambiarPassword: d['debeCambiarPassword'] === true,
    };
  }
}
