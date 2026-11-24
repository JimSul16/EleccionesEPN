import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

// us-central1: la misma región que el bucket, dentro de la cuota sin costo.
// maxInstances bajo para acotar el costo en el plan Blaze.
setGlobalOptions({ region: 'us-central1', maxInstances: 5 });

initializeApp();

export { crearUsuario, loginCedula, recuperarPassword, cambiarPassword } from './usuarios';
export { auditarActa } from './auditoria';
