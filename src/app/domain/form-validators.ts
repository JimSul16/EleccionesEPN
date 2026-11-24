import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { validarCedula } from './cedula.validator';
import { esEmailValido, esTelefonoValido } from './usuario.rules';

/**
 * Adaptadores de las reglas puras a Reactive Forms. La lógica vive en las
 * funciones puras; aquí solo se traduce al formato { clave: detalle } de Angular.
 */

export const cedulaValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const error = validarCedula(control.value);
  return error && error !== 'requerida' ? { cedula: error } : null;
};

export const telefonoValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.value && !esTelefonoValido(String(control.value)) ? { telefono: true } : null;

export const emailValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.value && !esEmailValido(String(control.value)) ? { email: true } : null;
