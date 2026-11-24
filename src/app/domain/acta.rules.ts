import { ORGANIZACION_IDS, type ConteoActa, type OrganizacionId } from './models';

/**
 * Reglas de consistencia de un acta (R6). La misma condición se vuelve a
 * comprobar en firestore.rules: el cliente valida para dar feedback inmediato,
 * el servidor valida para que no se pueda saltar.
 */

export type CampoConteo = OrganizacionId | 'nulos' | 'blancos' | 'totalSufragantes';

export interface ErrorCampo {
  campo: CampoConteo;
  mensaje: string;
}

export interface ResultadoValidacionActa {
  valida: boolean;
  /** Errores de cada campo (vacío, decimal, negativo). */
  errores: ErrorCampo[];
  /** Votos válidos + nulos + blancos, contando solo los campos correctos. */
  sumaCalculada: number;
  /** totalSufragantes - sumaCalculada. 0 cuando el acta cuadra. */
  diferencia: number;
}

/** Límite de seguridad por campo: ninguna JRV tiene tantos electores. */
export const MAXIMO_POR_CAMPO = 100_000;

function validarEntero(campo: CampoConteo, valor: unknown): ErrorCampo | null {
  if (valor === null || valor === undefined || valor === '') {
    return { campo, mensaje: 'Campo obligatorio.' };
  }
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isInteger(numero)) return { campo, mensaje: 'Debe ser un número entero.' };
  if (numero < 0) return { campo, mensaje: 'No puede ser negativo.' };
  if (numero > MAXIMO_POR_CAMPO) return { campo, mensaje: 'Valor fuera de rango.' };
  return null;
}

export function validarActa(conteo: ConteoActa): ResultadoValidacionActa {
  const errores: ErrorCampo[] = [];
  let suma = 0;

  const sumar = (campo: CampoConteo, valor: unknown): void => {
    const error = validarEntero(campo, valor);
    if (error) errores.push(error);
    else suma += Number(valor);
  };

  for (const id of ORGANIZACION_IDS) sumar(id, conteo.votos?.[id]);
  sumar('nulos', conteo.nulos);
  sumar('blancos', conteo.blancos);

  const errorTotal = validarEntero('totalSufragantes', conteo.totalSufragantes);
  if (errorTotal) errores.push(errorTotal);
  const total = errorTotal ? 0 : Number(conteo.totalSufragantes);

  const diferencia = total - suma;
  if (errores.length === 0 && diferencia !== 0) {
    errores.push({
      campo: 'totalSufragantes',
      mensaje:
        diferencia > 0
          ? `Faltan ${diferencia} votos para cuadrar con el total de sufragantes.`
          : `Sobran ${-diferencia} votos respecto al total de sufragantes.`,
    });
  }

  return { valida: errores.length === 0, errores, sumaCalculada: suma, diferencia };
}

/** Convierte lo que llega de un input (string, null) a número, para no sumar strings. */
export function aEntero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}
