export const environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'elecciones-epn.firebaseapp.com',
    projectId: 'elecciones-epn',
    storageBucket: 'elecciones-epn.appspot.com',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:abcdef123456'
  },
  emulatorPorts: {
    auth: 9099,
    firestore: 8085,
    storage: 9199,
    functions: 5001
  }
};
