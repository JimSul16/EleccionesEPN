export const environment = {
  production: true,
  useEmulators: false,
  firebase: {
    apiKey: 'YOUR_PROD_API_KEY',
    authDomain: 'elecciones-epn.firebaseapp.com',
    projectId: 'elecciones-epn',
    storageBucket: 'elecciones-epn.firebasestorage.app',
    messagingSenderId: 'YOUR_PROD_MESSAGING_SENDER_ID',
    appId: 'YOUR_PROD_APP_ID'
  },
  emulatorPorts: {
    auth: 9099,
    firestore: 8085,
    storage: 9199,
    functions: 5001
  }
};
