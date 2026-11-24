/** Validaciones de datos de cuenta (R2, R3). Puras y reutilizables en formularios. */

export const PASSWORD_INICIAL = 'Ecuador2026';

export type ErrorPassword = 'longitud' | 'mayuscula' | 'minuscula' | 'numero' | 'igualInicial' | 'noCoincide';

export function validarPasswordNueva(password: string, confirmacion?: string): ErrorPassword[] {
  const errores: ErrorPassword[] = [];
  if (password.length < 8) errores.push('longitud');
  if (!/[A-Z]/.test(password)) errores.push('mayuscula');
  if (!/[a-z]/.test(password)) errores.push('minuscula');
  if (!/\d/.test(password)) errores.push('numero');
  if (password === PASSWORD_INICIAL) errores.push('igualInicial');
  if (confirmacion !== undefined && confirmacion !== password) errores.push('noCoincide');
  return errores;
}

export const MENSAJES_PASSWORD: Record<ErrorPassword, string> = {
  longitud: 'Mínimo 8 caracteres.',
  mayuscula: 'Incluya al menos una mayúscula.',
  minuscula: 'Incluya al menos una minúscula.',
  numero: 'Incluya al menos un número.',
  igualInicial: 'No puede ser la contraseña inicial.',
  noCoincide: 'Las contraseñas no coinciden.',
};

/** Celular ecuatoriano: 09 seguido de 8 dígitos. */
export function esTelefonoValido(telefono: string): boolean {
  return /^09\d{8}$/.test(telefono.trim());
}

export function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
