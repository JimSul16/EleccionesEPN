import type { Type } from '@angular/core';
import type { Routes } from '@angular/router';

import { authGuard, invitadoGuard, primerAccesoGuard, rolGuard } from './core/guards';

const inicioRol = (): Promise<Type<unknown>> =>
  import('./features/shared/inicio-rol.page').then((m) => m.InicioRolPage);

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'recuperar',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/recuperar/recuperar.page').then((m) => m.RecuperarPage),
  },
  {
    path: 'cambiar-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/cambiar-password/cambiar-password.page').then((m) => m.CambiarPasswordPage),
  },
  {
    path: 'provincial',
    canActivate: [authGuard, primerAccesoGuard, rolGuard('PROVINCIAL')],
    loadComponent: inicioRol,
    data: { titulo: 'Coordinación provincial' },
  },
  {
    path: 'recinto',
    canActivate: [authGuard, primerAccesoGuard, rolGuard('RECINTO')],
    loadComponent: inicioRol,
    data: { titulo: 'Coordinación de recinto' },
  },
  {
    path: 'veedor',
    canActivate: [authGuard, primerAccesoGuard, rolGuard('VEEDOR')],
    loadComponent: () => import('./features/veedor/mis-mesas.page').then((m) => m.MisMesasPage),
  },
  {
    // Registro (veedor) y corrección (veedor y coordinador de recinto) de un acta.
    path: 'acta/:jrvId/:dignidad',
    canActivate: [authGuard, primerAccesoGuard, rolGuard('VEEDOR', 'RECINTO')],
    loadComponent: () => import('./features/actas/acta.page').then((m) => m.ActaPage),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
