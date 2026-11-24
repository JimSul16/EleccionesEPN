import { Injectable } from '@angular/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, indexedDBLocalPersistence, initializeAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

import { environment } from '../../environments/environment';

/**
 * Punto único de inicialización de Firebase. Solo la capa data/ y core/ lo usan;
 * las páginas nunca importan el SDK directamente.
 *
 * - Firestore con caché persistente en IndexedDB: las lecturas funcionan sin red
 *   y las escrituras se encolan y se sincronizan solas (R10).
 * - Auth con persistencia en IndexedDB: en la WebView de Capacitor la sesión
 *   sobrevive al cierre de la app.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly storage: FirebaseStorage;
  readonly functions: Functions;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = initializeAuth(this.app, { persistence: indexedDBLocalPersistence });
    this.db = initializeFirestore(this.app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
    });
    this.storage = getStorage(this.app);
    this.functions = getFunctions(this.app, 'us-central1');

    if (environment.useEmulators) {
      const host = 'localhost';
      const p = environment.emulatorPorts;
      connectAuthEmulator(this.auth, `http://${host}:${p.auth}`, { disableWarnings: true });
      connectFirestoreEmulator(this.db, host, p.firestore);
      connectStorageEmulator(this.storage, host, p.storage);
      connectFunctionsEmulator(this.functions, host, p.functions);
    }
  }
}
