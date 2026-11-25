import type { Acta, Dignidad } from './models';
import { sumarActas } from './totales';

const acta = (id: string, recintoId: string, dignidad: Dignidad, o1: number): Acta => ({
  id,
  jrvId: id,
  recintoId,
  dignidad,
  votos: { o1, o2: 1, o3: 0, o4: 0, o5: 0 },
  nulos: 2,
  blancos: 3,
  totalSufragantes: o1 + 6,
  fotoPath: null,
  ubicacion: null,
  estado: 'REGISTRADA',
  version: 1,
  registradoPor: 'u',
  updatedBy: 'u',
});

describe('sumarActas', () => {
  const actas = [acta('a', 'r1', 'ALCALDE', 10), acta('b', 'r2', 'ALCALDE', 5), acta('c', 'r1', 'PREFECTO', 7)];

  it('suma el consolidado de una dignidad', () => {
    const t = sumarActas(actas, 'ALCALDE');
    expect(t.actas).toBe(2);
    expect(t.votos).toEqual({ o1: 15, o2: 2, o3: 0, o4: 0, o5: 0 });
    expect(t.nulos).toBe(4);
    expect(t.blancos).toBe(6);
    expect(t.totalSufragantes).toBe(27);
  });

  it('filtra por recinto', () => {
    const t = sumarActas(actas, 'ALCALDE', 'r1');
    expect(t.actas).toBe(1);
    expect(t.votos.o1).toBe(10);
  });

  it('devuelve ceros sin actas', () => {
    const t = sumarActas([], 'PREFECTO');
    expect(t.actas).toBe(0);
    expect(t.votos).toEqual({ o1: 0, o2: 0, o3: 0, o4: 0, o5: 0 });
  });
});
