import { Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';

import { ANCHO_ANALISIS, evaluarNitidez, UMBRAL_NITIDEZ } from '../domain/nitidez';

/**
 * Tope del JPEG en base64. Un documento de Firestore admite 1 MiB y las reglas
 * exigen menos de 950 000 caracteres: se deja margen.
 */
export const MAX_BASE64 = 700_000;

/** Intentos de compresión, de mejor a peor calidad, hasta entrar en el tope. */
const INTENTOS: { lado: number; calidad: number }[] = [
  { lado: 1600, calidad: 0.7 },
  { lado: 1400, calidad: 0.65 },
  { lado: 1200, calidad: 0.6 },
  { lado: 1000, calidad: 0.55 },
  { lado: 800, calidad: 0.5 },
];

export type ErrorFoto = 'cancelada' | 'permisoDenegado' | 'sinCamara' | 'muyGrande' | 'fallo';

export class FotoError extends Error {
  constructor(readonly tipo: ErrorFoto) {
    super(tipo);
  }
}

export interface FotoCapturada {
  /** JPEG en base64 (sin el prefijo data:), listo para guardar en Firestore. */
  base64: string;
  /** Tamaño aproximado del JPEG en bytes. */
  bytes: number;
  /** data URL para la vista previa. */
  vistaPrevia: string;
  nitida: boolean;
  puntajeNitidez: number;
}

/** Códigos de error del plugin @capacitor/camera 8 (CameraErrorCode). */
const CODIGOS: Record<string, ErrorFoto> = {
  'OS-PLUG-CAMR-0003': 'permisoDenegado',
  'OS-PLUG-CAMR-0006': 'cancelada',
  'OS-PLUG-CAMR-0007': 'sinCamara',
};

/**
 * Captura, control de nitidez (R7) y compresión de la foto del acta.
 * Plan gratuito Spark (ADR-018): la foto se guarda en Firestore (colección
 * fotos) y no en Storage. Se toma siempre con la cámara y se recodifica como
 * JPEG en un canvas, así el formato y el tamaño están garantizados.
 */
@Injectable({ providedIn: 'root' })
export class FotoService {
  /** Pide permiso si hace falta. Devuelve false si el usuario lo niega. */
  async asegurarPermiso(): Promise<boolean> {
    try {
      const estado = await Camera.checkPermissions();
      if (estado.camera === 'granted' || estado.camera === 'limited') return true;
      const pedido = await Camera.requestPermissions({ permissions: ['camera'] });
      return pedido.camera === 'granted' || pedido.camera === 'limited';
    } catch {
      // En el navegador (ionic serve) no hay permisos nativos: se deja intentar.
      return true;
    }
  }

  async capturar(umbral = UMBRAL_NITIDEZ): Promise<FotoCapturada> {
    if (!(await this.asegurarPermiso())) throw new FotoError('permisoDenegado');

    let webPath: string | undefined;
    try {
      const r = await Camera.takePhoto({
        quality: 90,
        targetWidth: INTENTOS[0].lado,
        targetHeight: INTENTOS[0].lado,
        correctOrientation: true,
        saveToGallery: false,
      });
      webPath = r.webPath;
    } catch (e) {
      const codigo = (e as { code?: string }).code ?? '';
      const mensaje = String((e as { message?: string }).message ?? '').toLowerCase();
      if (CODIGOS[codigo]) throw new FotoError(CODIGOS[codigo]);
      if (mensaje.includes('cancel')) throw new FotoError('cancelada');
      throw new FotoError('fallo');
    }
    if (!webPath) throw new FotoError('fallo');

    const original = await cargarImagen(webPath);
    const { nitida, puntaje } = medirNitidez(original, umbral);
    const dataUrl = comprimirDentroDelTope(original);
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    return {
      base64,
      bytes: Math.floor((base64.length * 3) / 4),
      vistaPrevia: dataUrl,
      nitida,
      puntajeNitidez: puntaje,
    };
  }
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new FotoError('fallo'));
    img.src = src;
  });
}

function dibujar(img: HTMLImageElement, ladoMaximo: number): HTMLCanvasElement {
  const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * escala);
  canvas.height = Math.round(img.naturalHeight * escala);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Prueba resoluciones y calidades decrecientes hasta que el base64 entra en MAX_BASE64. */
function comprimirDentroDelTope(img: HTMLImageElement): string {
  for (const { lado, calidad } of INTENTOS) {
    const dataUrl = dibujar(img, lado).toDataURL('image/jpeg', calidad);
    if (dataUrl.length - dataUrl.indexOf(',') - 1 <= MAX_BASE64) return dataUrl;
  }
  throw new FotoError('muyGrande');
}

/** Mide sobre una versión reducida: más rápido y el umbral no depende de la resolución de la cámara. */
function medirNitidez(img: HTMLImageElement, umbral: number): { nitida: boolean; puntaje: number } {
  const canvas = dibujar(img, ANCHO_ANALISIS);
  const datos = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  return evaluarNitidez(datos.data, canvas.width, canvas.height, umbral);
}
