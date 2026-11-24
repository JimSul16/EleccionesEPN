import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import type { Rol } from '../domain/models';

import { AuthService } from './auth.service';

/**
 * Guards de navegación. Solo mejoran la UX: la seguridad real está en
 * firestore.rules y storage.rules (R8).
 */

/** Exige sesión. Sin sesión, al login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.esperarListo();
  return auth.autenticado() ? true : inject(Router).parseUrl('/login');
};

/** Con contraseña inicial, obliga a cambiarla antes de entrar (R3). */
export const primerAccesoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.esperarListo();
  return auth.usuario()?.debeCambiarPassword ? inject(Router).parseUrl('/cambiar-password') : true;
};

/** Restringe una sección a ciertos roles; si no corresponde, lo envía a su inicio. */
export function rolGuard(...roles: Rol[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    await auth.esperarListo();
    const rol = auth.rol();
    return rol && roles.includes(rol) ? true : inject(Router).parseUrl(auth.inicioPorRol(rol));
  };
}

/** Para login y recuperación: si ya hay sesión, va directo a su inicio. */
export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.esperarListo();
  return auth.autenticado() ? inject(Router).parseUrl(auth.inicioPorRol()) : true;
};
