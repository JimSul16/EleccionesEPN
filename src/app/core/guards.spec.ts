import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';

import type { Rol, Usuario } from '../domain/models';

import { AuthService } from './auth.service';
import { authGuard, invitadoGuard, primerAccesoGuard, rolGuard } from './guards';

/**
 * AuthService falso cuya sesión se resuelve de forma asíncrona, como en la app.
 * Reproduce el bug NG0203: un guard que llamaba inject() después de un await.
 */
function authFalso(usuario: Partial<Usuario> | null) {
  const u = signal(usuario as Usuario | null);
  return {
    usuario: u,
    rol: computed(() => u()?.rol ?? null),
    autenticado: computed(() => u() !== null),
    esperarListo: () => new Promise<void>((r) => setTimeout(r, 0)),
    inicioPorRol: (rol: Rol | null = u()?.rol ?? null) =>
      rol === 'VEEDOR' ? '/veedor' : rol === 'RECINTO' ? '/recinto' : rol === 'PROVINCIAL' ? '/provincial' : '/login',
  };
}

async function ejecutar(guard: typeof authGuard, usuario: Partial<Usuario> | null): Promise<string | boolean> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: authFalso(usuario) }],
  });
  const r = await TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  return r instanceof UrlTree ? TestBed.inject(Router).serializeUrl(r) : (r as boolean);
}

describe('guards', () => {
  it('authGuard deja pasar con sesión y redirige al login sin ella', async () => {
    expect(await ejecutar(authGuard, { rol: 'VEEDOR' })).toBe(true);
    TestBed.resetTestingModule();
    expect(await ejecutar(authGuard, null)).toBe('/login');
  });

  it('primerAccesoGuard obliga a cambiar la contraseña inicial', async () => {
    expect(await ejecutar(primerAccesoGuard, { rol: 'VEEDOR', debeCambiarPassword: true })).toBe('/cambiar-password');
    TestBed.resetTestingModule();
    expect(await ejecutar(primerAccesoGuard, { rol: 'VEEDOR', debeCambiarPassword: false })).toBe(true);
  });

  it('rolGuard envía a cada rol a su propio inicio', async () => {
    expect(await ejecutar(rolGuard('VEEDOR'), { rol: 'VEEDOR' })).toBe(true);
    TestBed.resetTestingModule();
    expect(await ejecutar(rolGuard('PROVINCIAL'), { rol: 'VEEDOR' })).toBe('/veedor');
  });

  it('invitadoGuard redirige a quien ya tiene sesión', async () => {
    expect(await ejecutar(invitadoGuard, { rol: 'RECINTO' })).toBe('/recinto');
    TestBed.resetTestingModule();
    expect(await ejecutar(invitadoGuard, null)).toBe(true);
  });
});
