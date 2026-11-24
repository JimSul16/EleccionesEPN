import type { Type } from '@angular/core';
import type { Routes } from '@angular/router';

import { authGuard, invitadoGuard, primerAccesoGuard, rolGuard } from './core/guards';

const crearUsuario = (): Promise<Type<unknown>> =>
  import('./features/usuarios/crear-usuario.page').then((m) => m.CrearUsuarioPage);

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
    children: [
      { path: '', loadComponent: () => import('./features/provincial/recintos.page').then((m) => m.RecintosPage) },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/provincial/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'ubicaciones',
        loadComponent: () => import('./features/provincial/ubicaciones.page').then((m) => m.UbicacionesPage),
      },
      {
        path: 'recintos/nuevo',
        loadComponent: () => import('./features/provincial/nuevo-recinto.page').then((m) => m.NuevoRecintoPage),
      },
      {
        // Crear el coordinador de un recinto: el recintoId llega como input de la página.
        path: 'recintos/:recintoId/coordinador',
        loadComponent: crearUsuario,
        data: { rol: 'RECINTO' },
      },
    ],
  },
  {
    path: 'recinto',
    canActivate: [authGuard, primerAccesoGuard, rolGuard('RECINTO')],
    loadComponent: () => import('./features/recinto/mesas-recinto.page').then((m) => m.MesasRecintoPage),
  },
  {
    path: 'recinto/veedores/nuevo',
    canActivate: [authGuard, primerAccesoGuard, rolGuard('RECINTO')],
    loadComponent: crearUsuario,
    data: { rol: 'VEEDOR' },
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
