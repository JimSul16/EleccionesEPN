import { Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';

/** Estado de la conexión como signal, para el indicador de la UI y la sincronización (R10). */
@Injectable({ providedIn: 'root' })
export class RedService {
  private readonly _conectado = signal(true);
  readonly conectado = this._conectado.asReadonly();

  private readonly alReconectar: (() => void)[] = [];

  constructor() {
    void Network.getStatus().then((s) => this._conectado.set(s.connected));
    void Network.addListener('networkStatusChange', (s) => {
      const antes = this._conectado();
      this._conectado.set(s.connected);
      if (!antes && s.connected) this.alReconectar.forEach((fn) => fn());
    });
  }

  /** Registra una acción a ejecutar cada vez que vuelve la conexión. */
  cuandoReconecte(fn: () => void): void {
    this.alReconectar.push(fn);
  }
}
