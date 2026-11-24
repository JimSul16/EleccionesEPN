import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

import type { Ubicacion } from '../domain/models';

export type ErrorUbicacion = 'permisoDenegado' | 'gpsApagado' | 'tiempoAgotado' | 'fallo';

export class UbicacionError extends Error {
  constructor(readonly tipo: ErrorUbicacion) {
    super(tipo);
  }
}

/** Códigos de error de @capacitor/geolocation 8 (README del plugin, sección Errors). */
const CODIGOS: Record<string, ErrorUbicacion> = {
  'OS-PLUG-GLOC-0003': 'permisoDenegado',
  'OS-PLUG-GLOC-0007': 'gpsApagado',
  'OS-PLUG-GLOC-0009': 'gpsApagado',
  'OS-PLUG-GLOC-0010': 'tiempoAgotado',
};

export const MENSAJES_UBICACION: Record<ErrorUbicacion, string> = {
  permisoDenegado: 'Sin permiso de ubicación. Actívelo en Ajustes > Aplicaciones > Control electoral > Permisos.',
  gpsApagado: 'La ubicación del teléfono está apagada. Actívela e intente de nuevo.',
  tiempoAgotado: 'No se obtuvo señal GPS a tiempo. Acérquese a una ventana e intente de nuevo.',
  fallo: 'No se pudo obtener la ubicación.',
};

/**
 * GPS del acta (R7). Primero intenta alta precisión; si se agota el tiempo
 * (típico dentro de un aula), reintenta con precisión normal, que usa redes
 * y responde antes. La precisión obtenida se guarda junto a las coordenadas.
 */
@Injectable({ providedIn: 'root' })
export class UbicacionService {
  async asegurarPermiso(): Promise<boolean> {
    try {
      const estado = await Geolocation.checkPermissions();
      if (estado.location === 'granted') return true;
      const pedido = await Geolocation.requestPermissions({ permissions: ['location'] });
      return pedido.location === 'granted';
    } catch (e) {
      const codigo = (e as { code?: string }).code ?? '';
      if (CODIGOS[codigo] === 'gpsApagado') throw new UbicacionError('gpsApagado');
      // En el navegador no hay permisos nativos: se deja intentar.
      return true;
    }
  }

  async obtener(): Promise<Ubicacion> {
    if (!(await this.asegurarPermiso())) throw new UbicacionError('permisoDenegado');
    try {
      return await this.leer(true, 15_000);
    } catch (e) {
      if (e instanceof UbicacionError && e.tipo === 'tiempoAgotado') return this.leer(false, 20_000);
      throw e;
    }
  }

  private async leer(enableHighAccuracy: boolean, timeout: number): Promise<Ubicacion> {
    try {
      const p = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout, maximumAge: 30_000 });
      return {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        precisionM: Math.round(p.coords.accuracy ?? 0),
      };
    } catch (e) {
      const codigo = (e as { code?: string | number }).code;
      if (typeof codigo === 'string' && CODIGOS[codigo]) throw new UbicacionError(CODIGOS[codigo]);
      // GeolocationPositionError del navegador: 1 permiso, 3 timeout.
      if (codigo === 1) throw new UbicacionError('permisoDenegado');
      if (codigo === 3) throw new UbicacionError('tiempoAgotado');
      throw new UbicacionError('fallo');
    }
  }
}
