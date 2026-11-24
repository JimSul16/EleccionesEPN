import { evaluarNitidez, rgbaAGrises, varianzaLaplaciano } from './nitidez';

/** Imagen RGBA de prueba a partir de una función de luminancia por píxel. */
function imagen(ancho: number, alto: number, luminancia: (x: number, y: number) => number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(ancho * alto * 4);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const p = (y * ancho + x) * 4;
      const v = luminancia(x, y);
      data[p] = data[p + 1] = data[p + 2] = v;
      data[p + 3] = 255;
    }
  }
  return data;
}

describe('nitidez', () => {
  const W = 64;
  const H = 64;

  it('convierte RGBA a grises', () => {
    const grises = rgbaAGrises([255, 255, 255, 255, 0, 0, 0, 255], 2, 1);
    expect(grises[0]).toBeCloseTo(255, 0);
    expect(grises[1]).toBe(0);
  });

  it('una imagen plana tiene varianza cero', () => {
    const plana = rgbaAGrises(
      imagen(W, H, () => 128),
      W,
      H,
    );
    expect(varianzaLaplaciano(plana, W, H)).toBe(0);
  });

  it('un tablero de ajedrez (bordes nítidos) supera el umbral', () => {
    const tablero = imagen(W, H, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 255 : 0));
    expect(evaluarNitidez(tablero, W, H).nitida).toBe(true);
  });

  it('un degradado suave (como una foto borrosa) queda bajo el umbral', () => {
    const degradado = imagen(W, H, (x) => Math.round((x / (W - 1)) * 255));
    const r = evaluarNitidez(degradado, W, H);
    expect(r.nitida).toBe(false);
    expect(r.puntaje).toBeLessThan(5);
  });

  it('la versión desenfocada de una imagen puntúa menos que la original', () => {
    const nitida = imagen(W, H, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 255 : 0));
    const borrosa = imagen(W, H, (x, y) => 127 + 60 * Math.sin(x / 6) * Math.cos(y / 6));
    expect(evaluarNitidez(nitida, W, H).puntaje).toBeGreaterThan(evaluarNitidez(borrosa, W, H).puntaje);
  });

  it('no falla con imágenes diminutas', () => {
    expect(varianzaLaplaciano([1, 2, 3, 4], 2, 2)).toBe(0);
  });
});
