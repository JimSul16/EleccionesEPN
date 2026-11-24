/**
 * Copia de servidor de las reglas de src/app/domain/ (cedula.validator.ts,
 * models.ts, usuario.rules.ts). El cliente valida para dar feedback; aquí se
 * valida para que no se pueda saltar. Si cambia una, cambiar la otra.
 */

export type Rol = 'PROVINCIAL' | 'RECINTO' | 'VEEDOR';

export const PASSWORD_INICIAL = 'Ecuador2026';

export function esCedulaValida(valor: unknown): boolean {
  if (typeof valor !== 'string' || !/^\d{10}$/.test(valor)) return false;
  const provincia = Number(valor.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (Number(valor[2]) >= 6) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    const producto = Number(valor[i]) * (i % 2 === 0 ? 2 : 1);
    suma += producto > 9 ? producto - 9 : producto;
  }
  return (10 - (suma % 10)) % 10 === Number(valor[9]);
}

export function puedeCrear(creador: Rol, nuevo: Rol): boolean {
  return (creador === 'PROVINCIAL' && nuevo === 'RECINTO') || (creador === 'RECINTO' && nuevo === 'VEEDOR');
}

export function esTelefonoValido(valor: unknown): boolean {
  return typeof valor === 'string' && /^09\d{8}$/.test(valor);
}

export function esEmailValido(valor: unknown): boolean {
  return typeof valor === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
}

export function esTextoValido(valor: unknown, max = 80): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= max;
}

export function esPasswordSegura(password: unknown): password is string {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    password !== PASSWORD_INICIAL
  );
}
