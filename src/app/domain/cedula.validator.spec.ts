import { esCedulaValida, validarCedula } from './cedula.validator';

describe('validarCedula', () => {
  it.each(['1712345675', '0912345675', '0100000009', '2405123452', '3000000012'])(
    'acepta la cédula válida %s',
    (cedula) => {
      expect(validarCedula(cedula)).toBeNull();
      expect(esCedulaValida(cedula)).toBe(true);
    },
  );

  it('ignora espacios alrededor', () => {
    expect(validarCedula(' 1712345675 ')).toBeNull();
  });

  it('exige el valor', () => {
    expect(validarCedula('')).toBe('requerida');
    expect(validarCedula(null)).toBe('requerida');
  });

  it('exige exactamente 10 dígitos', () => {
    expect(validarCedula('171234567')).toBe('formato');
    expect(validarCedula('17123456755')).toBe('formato');
    expect(validarCedula('17123A5675')).toBe('formato');
  });

  it('rechaza provincias inexistentes', () => {
    expect(validarCedula('0012345675')).toBe('provincia');
    expect(validarCedula('2512345675')).toBe('provincia');
  });

  it('rechaza tercer dígito mayor o igual a 6', () => {
    expect(validarCedula('1762345675')).toBe('tercerDigito');
  });

  it('rechaza un dígito verificador incorrecto', () => {
    expect(validarCedula('1712345670')).toBe('verificador');
    expect(validarCedula('0912345676')).toBe('verificador');
  });
});
