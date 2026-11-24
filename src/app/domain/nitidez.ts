/**
 * Detección de fotos borrosas (R7) con la varianza del Laplaciano.
 * Una foto nítida tiene bordes marcados, el Laplaciano responde fuerte en ellos
 * y su varianza es alta. Una foto movida o desenfocada da varianza baja.
 *
 * Funciones puras sobre arreglos de píxeles: la carga de la imagen en un canvas
 * y el redimensionado viven en data/foto.service.ts.
 */

/** Ancho al que se reduce la imagen antes de medir (más rápido y umbral estable). */
export const ANCHO_ANALISIS = 640;

/**
 * Umbral por defecto. Hay que calibrarlo con fotos reales de actas tomadas
 * con el teléfono de la demo y anotar el valor final en ADR-008.
 */
export const UMBRAL_NITIDEZ = 80;

/** RGBA (como ImageData.data) a luminancia en escala de grises (ITU-R BT.601). */
export function rgbaAGrises(rgba: ArrayLike<number>, ancho: number, alto: number): Float32Array {
  const grises = new Float32Array(ancho * alto);
  for (let i = 0, p = 0; i < grises.length; i++, p += 4) {
    grises[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  return grises;
}

/** Varianza de la respuesta al kernel Laplaciano [0 1 0; 1 -4 1; 0 1 0], sin los bordes. */
export function varianzaLaplaciano(grises: ArrayLike<number>, ancho: number, alto: number): number {
  if (ancho < 3 || alto < 3) return 0;
  let suma = 0;
  let sumaCuadrados = 0;
  let n = 0;
  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const i = y * ancho + x;
      const valor = grises[i - ancho] + grises[i + ancho] + grises[i - 1] + grises[i + 1] - 4 * grises[i];
      suma += valor;
      sumaCuadrados += valor * valor;
      n++;
    }
  }
  const media = suma / n;
  return sumaCuadrados / n - media * media;
}

export interface ResultadoNitidez {
  nitida: boolean;
  puntaje: number;
}

export function evaluarNitidez(
  rgba: ArrayLike<number>,
  ancho: number,
  alto: number,
  umbral = UMBRAL_NITIDEZ,
): ResultadoNitidez {
  const puntaje = varianzaLaplaciano(rgbaAGrises(rgba, ancho, alto), ancho, alto);
  return { nitida: puntaje >= umbral, puntaje: Math.round(puntaje) };
}
