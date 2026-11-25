import { ORGANIZACION_IDS, type Acta, type Dignidad, type Votos } from './models';

/** Totales del dashboard (R4). */
export interface TotalesVotos {
  actas: number;
  votos: Votos;
  nulos: number;
  blancos: number;
  totalSufragantes: number;
}

/**
 * Suma las actas de una dignidad, en todo el cantón o en un recinto. Se calcula
 * sobre las actas que el provincial ya recibe en tiempo real (ver ProvincialStore),
 * sin consultas extra ni índices.
 */
export function sumarActas(actas: readonly Acta[], dignidad: Dignidad, recintoId?: string): TotalesVotos {
  const total: TotalesVotos = {
    actas: 0,
    votos: Object.fromEntries(ORGANIZACION_IDS.map((o) => [o, 0])) as Votos,
    nulos: 0,
    blancos: 0,
    totalSufragantes: 0,
  };
  for (const a of actas) {
    if (a.dignidad !== dignidad || (recintoId && a.recintoId !== recintoId)) continue;
    total.actas++;
    for (const o of ORGANIZACION_IDS) total.votos[o] += Number(a.votos?.[o]) || 0;
    total.nulos += Number(a.nulos) || 0;
    total.blancos += Number(a.blancos) || 0;
    total.totalSufragantes += Number(a.totalSufragantes) || 0;
  }
  return total;
}
