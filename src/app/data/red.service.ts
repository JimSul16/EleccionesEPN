import { inject, Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';
import { waitForPendingWrites } from 'firebase/firestore';

import { FirebaseService } from '../core/firebase';

/**
 * Estado de la conexión y de la sincronización, como signals (R9, R10).
 * Sin red, Firestore guarda las actas y sus fotos en su cola local; al volver la
 * red, `sincronizando` queda en true hasta que todas las escrituras pendientes
 * llegaron al servidor.
 */
@Injectable({ providedIn: 'root' })
export class RedService {
  private readonly fb = inject(FirebaseService);

  private readonly _conectado = signal(true);
  private readonly _sincronizando = signal(false);
  readonly conectado = this._conectado.asReadonly();
  readonly sincronizando = this._sincronizando.asReadonly();

  private readonly alReconectar: (() => void)[] = [];

  constructor() {
    void Network.getStatus().then((s) => this._conectado.set(s.connected));
    void Network.addListener('networkStatusChange', (s) => {
      const antes = this._conectado();
      this._conectado.set(s.connected);
      if (!antes && s.connected) {
        this.esperarSincronizacion();
        this.alReconectar.forEach((fn) => fn());
      }
    });
  }

  /** Registra una acción a ejecutar cada vez que vuelve la conexión. */
  cuandoReconecte(fn: () => void): void {
    this.alReconectar.push(fn);
  }

  private esperarSincronizacion(): void {
    this._sincronizando.set(true);
    waitForPendingWrites(this.fb.db)
      .catch(() => undefined)
      .finally(() => this._sincronizando.set(false));
  }
}
