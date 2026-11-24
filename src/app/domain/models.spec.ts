import { actaId, estadoMesa, jrvId, puedeCrear, rutaFotoActa } from './models';
import { esEmailValido, esTelefonoValido, validarPasswordNueva } from './usuario.rules';

describe('models', () => {
  it('genera ids deterministas', () => {
    expect(jrvId('rec1', 7)).toBe('rec1_7');
    expect(actaId('rec1_7', 'ALCALDE')).toBe('rec1_7_ALCALDE');
    expect(rutaFotoActa('rec1', 'rec1_7', 'PREFECTO', 'abc')).toBe('actas/rec1/rec1_7/PREFECTO-abc.jpg');
  });

  it('calcula el estado de la mesa', () => {
    expect(estadoMesa(null, 0)).toBe('SIN_VEEDOR');
    expect(estadoMesa('v1', 0)).toBe('PENDIENTE');
    expect(estadoMesa('v1', 1)).toBe('PARCIAL');
    expect(estadoMesa('v1', 2)).toBe('COMPLETA');
  });

  it('respeta la jerarquía de creación de cuentas', () => {
    expect(puedeCrear('PROVINCIAL', 'RECINTO')).toBe(true);
    expect(puedeCrear('RECINTO', 'VEEDOR')).toBe(true);
    expect(puedeCrear('PROVINCIAL', 'VEEDOR')).toBe(false);
    expect(puedeCrear('RECINTO', 'RECINTO')).toBe(false);
    expect(puedeCrear('VEEDOR', 'VEEDOR')).toBe(false);
    expect(puedeCrear('RECINTO', 'PROVINCIAL')).toBe(false);
  });
});

describe('usuario.rules', () => {
  it('valida la contraseña nueva', () => {
    expect(validarPasswordNueva('Segura2026x', 'Segura2026x')).toEqual([]);
    expect(validarPasswordNueva('Ecuador2026')).toContain('igualInicial');
    expect(validarPasswordNueva('corta1A')).toContain('longitud');
    expect(validarPasswordNueva('sinmayuscula1')).toContain('mayuscula');
    expect(validarPasswordNueva('SINMINUSCULA1')).toContain('minuscula');
    expect(validarPasswordNueva('SinNumeroAqui')).toContain('numero');
    expect(validarPasswordNueva('Segura2026x', 'otra')).toContain('noCoincide');
  });

  it('valida teléfono y correo', () => {
    expect(esTelefonoValido('0991234567')).toBe(true);
    expect(esTelefonoValido('022345678')).toBe(false);
    expect(esEmailValido('veedor@epn.edu.ec')).toBe(true);
    expect(esEmailValido('veedor@epn')).toBe(false);
  });
});
