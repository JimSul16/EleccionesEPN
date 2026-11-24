import { inject, Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { FirebaseService } from '../core/firebase';
import { ANCHO_ANALISIS, evaluarNitidez, UMBRAL_NITIDEZ } from '../domain/nitidez';

/** Lado mayor de la foto que se sube; suficiente para leer el acta, liviana para la red. */
const LADO_MAXIMO = 1600;
const CALIDAD_JPEG = 0.7;

export type ErrorFoto = 'cancelada' | 'permisoDenegado' | 'sinCamara' | 'fallo';

export class FotoError extends Error {
  constructor(readonly tipo: ErrorFoto) {
    super(tipo);
  }
}

export interface FotoCapturada {
  /** JPEG comprimido listo para subir. */
  blob: Blob;
  /** URL local para la vista previa (revocar al descartar). */
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
 * Captura, compresión, control de nitidez (R7) y subida a Storage.
 * La foto se toma siempre con la cámara (no desde la galería) y se vuelve a
 * codificar como JPEG en un canvas: así el formato y el tamaño están garantizados
 * y coinciden con lo que exige storage.rules.
 */
@Injectable({ providedIn: 'root' })
export class FotoService {
  private readonly fb = inject(FirebaseService);

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
        targetWidth: LADO_MAXIMO,
        targetHeight: LADO_MAXIMO,
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
    const blob = await comprimir(original);
    const { nitida, puntaje } = medirNitidez(original, umbral);
    return { blob, vistaPrevia: URL.createObjectURL(blob), nitida, puntajeNitidez: puntaje };
  }

  /** Sube la foto a su ruta definitiva (ver rutaFotoActa en domain/models.ts). */
  async subir(ruta: string, blob: Blob): Promise<void> {
    await uploadBytes(ref(this.fb.storage, ruta), blob, { contentType: 'image/jpeg' });
  }

  /** URL de descarga para mostrar la foto a quien tenga permiso (reglas de Storage). */
  url(ruta: string): Promise<string> {
    return getDownloadURL(ref(this.fb.storage, ruta));
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

function comprimir(img: HTMLImageElement): Promise<Blob> {
  const canvas = dibujar(img, LADO_MAXIMO);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new FotoError('fallo'))), 'image/jpeg', CALIDAD_JPEG),
  );
}

/** Mide sobre una versión reducida: más rápido y el umbral no depende de la resolución de la cámara. */
function medirNitidez(img: HTMLImageElement, umbral: number): { nitida: boolean; puntaje: number } {
  const canvas = dibujar(img, ANCHO_ANALISIS);
  const datos = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  return evaluarNitidez(datos.data, canvas.width, canvas.height, umbral);
}
