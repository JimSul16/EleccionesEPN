/**
 * Traduce errores de Firebase a mensajes para el usuario (R9: estados de error
 * explícitos). Los errores de la app con un mensaje ya pensado para el usuario
 * (ErrorParaUsuario) se muestran tal cual.
 */

/** Error cuyo mensaje se muestra tal cual al usuario. */
export class ErrorParaUsuario extends Error {}

const MENSAJES: Record<string, string> = {
  'permission-denied': 'No tiene permiso para esta acción.',
  'firestore/permission-denied': 'No tiene permiso para esta acción.',
  unavailable: 'Sin conexión con el servidor. Intente de nuevo.',
  'firestore/unavailable': 'Sin conexión. Los cambios se guardarán al recuperar la red.',
  'auth/network-request-failed': 'Sin conexión. Revise su red.',
  'auth/too-many-requests': 'Demasiados intentos. Espere unos minutos e intente de nuevo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/invalid-email': 'Correo no válido.',
  'auth/weak-password': 'La contraseña no cumple los requisitos.',
  'auth/requires-recent-login': 'Por seguridad, ingrese de nuevo y repita la operación.',
};

export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorParaUsuario) return error.message;
  const codigo = (error as { code?: string })?.code ?? '';
  return MENSAJES[codigo] ?? 'Ocurrió un error inesperado.';
}

/** true cuando el error es por falta de red: la UI ofrece reintentar en vez de mostrar un fallo. */
export function esErrorDeRed(error: unknown): boolean {
  const codigo = (error as { code?: string })?.code ?? '';
  return ['unavailable', 'firestore/unavailable', 'auth/network-request-failed'].includes(codigo);
}
