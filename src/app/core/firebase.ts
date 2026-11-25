import { Injectable } from '@angular/core';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from 'firebase/firestore';

import { environment } from '../../environments/environment';

/** Instancia temporal para crear cuentas de otras personas (ver crearAuthSecundaria). */
export interface AuthSecundaria {
  auth: Auth;
  cerrar: () => Promise<void>;
}

/**
 * Punto único de inicialización de Firebase. Solo la capa data/ y core/ lo usan;
 * las páginas nunca importan el SDK directamente.
 *
 * Plan gratuito Spark (ADR-018): solo Authentication y Firestore.
 * - Firestore con caché persistente en IndexedDB: las lecturas funcionan sin red
 *   y las escrituras (actas y fotos) se encolan y se sincronizan solas (R10).
 * - Auth con persistencia en IndexedDB: en la WebView de Capacitor la sesión
 *   sobrevive al cierre de la app.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = initializeAuth(this.app, { persistence: indexedDBLocalPersistence });
    this.db = initializeFirestore(this.app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
    });

    if (environment.useEmulators) {
      const p = environment.emulatorPorts;
      connectAuthEmulator(this.auth, `http://localhost:${p.auth}`, { disableWarnings: true });
      connectFirestoreEmulator(this.db, 'localhost', p.firestore);
    }
  }

  /**
   * Crear una cuenta con el SDK cliente inicia sesión como esa cuenta. Para que el
   * coordinador no pierda su propia sesión, la cuenta nueva se crea en una segunda
   * instancia de Firebase, en memoria, que se descarta al terminar.
   */
  crearAuthSecundaria(): AuthSecundaria {
    const app = initializeApp(environment.firebase, `alta-${Date.now()}`);
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    if (environment.useEmulators) {
      connectAuthEmulator(auth, `http://localhost:${environment.emulatorPorts.auth}`, { disableWarnings: true });
    }
    return { auth, cerrar: () => deleteApp(app) };
  }
}
