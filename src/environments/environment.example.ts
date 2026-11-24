// Template de variables de entorno para desarrollo y producción
// Copiar a environment.ts o environment.prod.ts y completar con las credenciales de Firebase del proyecto.

export const environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
  },
  emulatorPorts: {
    auth: 9099,
    firestore: 8085,
    storage: 9199,
    functions: 5001
  }
};
