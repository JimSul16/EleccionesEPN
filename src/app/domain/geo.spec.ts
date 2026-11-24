import { distanciaMetros, enlaceMapa, lejosDelRecinto } from './geo';

describe('geo', () => {
  const recinto = { lat: -0.1762, lng: -78.4812 };

  it('la distancia a sí mismo es cero', () => {
    expect(distanciaMetros(recinto, recinto)).toBe(0);
  });

  it('calcula distancias conocidas con precisión razonable', () => {
    // 0,01° de latitud son unos 1112 m.
    expect(distanciaMetros({ lat: 0, lng: 0 }, { lat: 0.01, lng: 0 })).toBeCloseTo(1112, -1);
    // Quito (Iñaquito) a Guayaquil (centro): unos 270 km en línea recta.
    const km = distanciaMetros(recinto, { lat: -2.1894, lng: -79.8891 }) / 1000;
    expect(km).toBeGreaterThan(260);
    expect(km).toBeLessThan(280);
  });

  it('marca un acta lejos de su recinto', () => {
    expect(lejosDelRecinto({ lat: -0.2007, lng: -78.5031, precisionM: 10 }, recinto)).toBe(true);
  });

  it('no marca un acta cerca del recinto', () => {
    expect(lejosDelRecinto({ lat: -0.1765, lng: -78.4815, precisionM: 15 }, recinto)).toBe(false);
  });

  it('descuenta la precisión del GPS antes de marcar', () => {
    // ~1,1 km de distancia, pero con 300 m de imprecisión no se marca.
    const acta = { lat: recinto.lat + 0.01, lng: recinto.lng, precisionM: 300 };
    expect(lejosDelRecinto(acta, recinto)).toBe(false);
    expect(lejosDelRecinto({ ...acta, precisionM: 5 }, recinto)).toBe(true);
  });

  it('genera el enlace al mapa', () => {
    expect(enlaceMapa({ lat: -0.1, lng: -78.5 })).toBe('https://www.google.com/maps/search/?api=1&query=-0.1,-78.5');
  });
});
