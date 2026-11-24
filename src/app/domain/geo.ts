/** Cálculos geográficos puros para el control de ubicación de las actas (R4, R7). */

const RADIO_TIERRA_M = 6_371_000;

export interface Punto {
  lat: number;
  lng: number;
}

/** Distancia en metros entre dos puntos (fórmula del semiverseno). */
export function distanciaMetros(a: Punto, b: Punto): number {
  const rad = (g: number): number => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Más allá de esta distancia del recinto, el acta se marca para revisión. */
export const DISTANCIA_SOSPECHOSA_M = 1000;

/**
 * true si el acta se registró lejos de su recinto. Se descuenta la precisión
 * del GPS: con una precisión de 300 m no se marca un desvío de 1,1 km.
 */
export function lejosDelRecinto(acta: Punto & { precisionM: number }, recinto: Punto): boolean {
  return distanciaMetros(acta, recinto) - acta.precisionM > DISTANCIA_SOSPECHOSA_M;
}

/** Enlace para abrir las coordenadas en un mapa. */
export function enlaceMapa(p: Punto): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}
