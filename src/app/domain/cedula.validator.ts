/**
 * Validación de cédula ecuatoriana (algoritmo módulo 10).
 * - 10 dígitos.
 * - Código de provincia 01-24, o 30 (ecuatorianos registrados en el exterior).
 * - Tercer dígito menor que 6 (persona natural).
 * - Dígito verificador: coeficientes 2,1,2,1,2,1,2,1,2 sobre los 9 primeros;
 *   si un producto pasa de 9 se le resta 9; verificador = (10 - suma % 10) % 10.
 *
 * functions/src/shared/cedula.ts contiene la misma lógica para el servidor;
 * los dos archivos deben cambiar juntos.
 */

export type ErrorCedula = 'requerida' | 'formato' | 'provincia' | 'tercerDigito' | 'verificador';

export function validarCedula(valor: string | null | undefined): ErrorCedula | null {
  const cedula = (valor ?? '').trim();
  if (cedula.length === 0) return 'requerida';
  if (!/^\d{10}$/.test(cedula)) return 'formato';

  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return 'provincia';

  if (Number(cedula[2]) >= 6) return 'tercerDigito';

  let suma = 0;
  for (let i = 0; i < 9; i++) {
    const producto = Number(cedula[i]) * (i % 2 === 0 ? 2 : 1);
    suma += producto > 9 ? producto - 9 : producto;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]) ? null : 'verificador';
}

export function esCedulaValida(valor: string | null | undefined): boolean {
  return validarCedula(valor) === null;
}

export const MENSAJES_CEDULA: Record<ErrorCedula, string> = {
  requerida: 'Ingrese la cédula.',
  formato: 'La cédula debe tener 10 dígitos.',
  provincia: 'Los dos primeros dígitos no corresponden a una provincia.',
  tercerDigito: 'El tercer dígito debe ser menor que 6.',
  verificador: 'El dígito verificador no es válido.',
};
