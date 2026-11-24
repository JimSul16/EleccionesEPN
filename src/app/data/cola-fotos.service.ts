import { inject, Injectable, signal } from '@angular/core';

import { FotoService } from './foto.service';
import { RedService } from './red.service';

interface FotoPendiente {
  ruta: string;
  blob: Blob;
  creada: number;
}

const DB_NOMBRE = 'elecciones-offline';
const STORE = 'fotos-pendientes';

/**
 * Cola de fotos sin subir (R10). Firestore ya encola solo las escrituras de actas,
 * pero Storage no: si no hay red, la foto se guarda en IndexedDB con su ruta
 * definitiva y se sube al volver la conexión. El acta ya apunta a esa ruta, así
 * que cuando la foto llega todo queda consistente.
 */
@Injectable({ providedIn: 'root' })
export class ColaFotosService {
  private readonly fotos = inject(FotoService);
  private readonly red = inject(RedService);

  private readonly _pendientes = signal(0);
  /** Cantidad de fotos esperando subir (para el indicador de la UI). */
  readonly pendientes = this._pendientes.asReadonly();
  private sincronizando = false;

  constructor() {
    this.red.cuandoReconecte(() => void this.sincronizar());
    void this.contar().then(() => this.sincronizar());
  }

  /** Intenta subir ya; si falla por red, la deja en cola. Devuelve true si quedó subida. */
  async subirOEncolar(ruta: string, blob: Blob): Promise<boolean> {
    if (this.red.conectado()) {
      try {
        await this.conPlazo(this.fotos.subir(ruta, blob), 20_000);
        return true;
      } catch (e) {
        if ((e as { code?: string }).code === 'storage/unauthorized') throw e;
      }
    }
    await this.guardar({ ruta, blob, creada: Date.now() });
    return false;
  }

  async sincronizar(): Promise<void> {
    if (this.sincronizando || !this.red.conectado()) return;
    this.sincronizando = true;
    try {
      for (const foto of await this.todas()) {
        try {
          await this.conPlazo(this.fotos.subir(foto.ruta, foto.blob), 30_000);
          await this.eliminar(foto.ruta);
        } catch (e) {
          // Sin permiso (por ejemplo, la mesa fue reasignada): no se reintenta para siempre.
          if ((e as { code?: string }).code === 'storage/unauthorized') await this.eliminar(foto.ruta);
          else break;
        }
      }
    } finally {
      this.sincronizando = false;
      await this.contar();
    }
  }

  private conPlazo<T>(p: Promise<T>, ms: number): Promise<T> {
    return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  }

  // ---------- IndexedDB mínimo ----------

  private abrir(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NOMBRE, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'ruta' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async tx<T>(modo: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.abrir();
    return new Promise((resolve, reject) => {
      const req = op(db.transaction(STORE, modo).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async guardar(f: FotoPendiente): Promise<void> {
    await this.tx('readwrite', (s) => s.put(f));
    await this.contar();
  }

  private async eliminar(ruta: string): Promise<void> {
    await this.tx('readwrite', (s) => s.delete(ruta));
  }

  private todas(): Promise<FotoPendiente[]> {
    return this.tx('readonly', (s) => s.getAll() as IDBRequest<FotoPendiente[]>);
  }

  private async contar(): Promise<void> {
    try {
      this._pendientes.set(await this.tx('readonly', (s) => s.count()));
    } catch {
      this._pendientes.set(0);
    }
  }
}
