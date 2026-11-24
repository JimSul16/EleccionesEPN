import { aEntero, validarActa } from './acta.rules';
import type { ConteoActa } from './models';

const actaQueCuadra = (): ConteoActa => ({
  votos: { o1: 120, o2: 80, o3: 40, o4: 10, o5: 5 },
  nulos: 12,
  blancos: 8,
  totalSufragantes: 275,
});

describe('validarActa', () => {
  it('acepta un acta cuyos totales cuadran', () => {
    const r = validarActa(actaQueCuadra());
    expect(r.valida).toBe(true);
    expect(r.errores).toEqual([]);
    expect(r.sumaCalculada).toBe(275);
    expect(r.diferencia).toBe(0);
  });

  it('acepta un acta con todo en cero', () => {
    const r = validarActa({ votos: { o1: 0, o2: 0, o3: 0, o4: 0, o5: 0 }, nulos: 0, blancos: 0, totalSufragantes: 0 });
    expect(r.valida).toBe(true);
  });

  it('informa cuántos votos faltan', () => {
    const r = validarActa({ ...actaQueCuadra(), totalSufragantes: 280 });
    expect(r.valida).toBe(false);
    expect(r.diferencia).toBe(5);
    expect(r.errores).toEqual([{ campo: 'totalSufragantes', mensaje: expect.stringContaining('Faltan 5') }]);
  });

  it('informa cuántos votos sobran', () => {
    const r = validarActa({ ...actaQueCuadra(), totalSufragantes: 270 });
    expect(r.diferencia).toBe(-5);
    expect(r.errores[0].mensaje).toContain('Sobran 5');
  });

  it('no suma strings como texto', () => {
    const conteo = { ...actaQueCuadra(), nulos: '12' as unknown as number };
    expect(validarActa(conteo).valida).toBe(true);
  });

  it('marca negativos, decimales y vacíos en su campo', () => {
    const conteo: ConteoActa = {
      votos: { o1: -1, o2: 2.5, o3: null as unknown as number, o4: 0, o5: 0 },
      nulos: 0,
      blancos: 0,
      totalSufragantes: 0,
    };
    const r = validarActa(conteo);
    expect(r.valida).toBe(false);
    expect(r.errores.map((e) => e.campo)).toEqual(['o1', 'o2', 'o3']);
    // Con errores de campo no se agrega además el error de cuadre.
    expect(r.errores.some((e) => e.mensaje.includes('Faltan') || e.mensaje.includes('Sobran'))).toBe(false);
  });

  it('exige el total de sufragantes', () => {
    const r = validarActa({ ...actaQueCuadra(), totalSufragantes: '' as unknown as number });
    expect(r.errores).toEqual([{ campo: 'totalSufragantes', mensaje: 'Campo obligatorio.' }]);
  });
});

describe('aEntero', () => {
  it('convierte valores de inputs', () => {
    expect(aEntero('15')).toBe(15);
    expect(aEntero(7)).toBe(7);
    expect(aEntero('')).toBeNull();
    expect(aEntero(null)).toBeNull();
    expect(aEntero('abc')).toBeNull();
  });
});
