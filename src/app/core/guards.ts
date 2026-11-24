import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import type { Rol } from '../domain/models';

import { AuthService } from './auth.service';

/**
 * Guards de navegación. Solo mejoran la UX: la seguridad real está en
 * firestore.rules y storage.rules (R8).
 *
 * Importante: inject() solo funciona antes del primer await (después se pierde
 * el contexto de inyección y Angular lanza NG0203). Por eso AuthService y Router
 * se obtienen siempre al inicio de cada guard.
 */

/** Exige sesión. Sin sesión, al login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.esperarListo();
  return auth.autenticado() ? true : router.parseUrl('/login');
};

/** Con contraseña inicial, obliga a cambiarla antes de entrar (R3). */
export const primerAccesoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.esperarListo();
  return auth.usuario()?.debeCambiarPassword ? router.parseUrl('/cambiar-password') : true;
};

/** Restringe una sección a ciertos roles; si no corresponde, lo envía a su inicio. */
export function rolGuard(...roles: Rol[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.esperarListo();
    const rol = auth.rol();
    return rol && roles.includes(rol) ? true : router.parseUrl(auth.inicioPorRol(rol));
  };
}

/** Para login y recuperación: si ya hay sesión, va directo a su inicio. */
export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.esperarListo();
  return auth.autenticado() ? router.parseUrl(auth.inicioPorRol()) : true;
};
