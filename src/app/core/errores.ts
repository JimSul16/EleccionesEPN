/**
 * Traduce errores de Firebase a mensajes para el usuario (R9: estados de error
 * explícitos). Los mensajes de las Cloud Functions ya vienen en español y se
 * muestran tal cual.
 */

const MENSAJES: Record<string, string> = {
  'permission-denied': 'No tiene permiso para esta acción.',
  'firestore/permission-denied': 'No tiene permiso para esta acción.',
  'storage/unauthorized': 'No tiene permiso para subir esta foto.',
  unavailable: 'Sin conexión con el servidor. Intente de nuevo.',
  'firestore/unavailable': 'Sin conexión. Los cambios se guardarán al recuperar la red.',
  'functions/unavailable': 'Sin conexión con el servidor. Intente de nuevo.',
  'functions/internal': 'Error del servidor. Intente de nuevo.',
  'functions/deadline-exceeded': 'El servidor tardó demasiado. Intente de nuevo.',
  'storage/retry-limit-exceeded': 'No se pudo subir la foto. Revise la conexión.',
  'auth/network-request-failed': 'Sin conexión. Revise su red.',
  'auth/invalid-custom-token': 'La sesión no es válida. Ingrese de nuevo.',
};

export function mensajeDeError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  const codigo = e?.code ?? '';
  if (
    codigo.startsWith('functions/') &&
    !['functions/internal', 'functions/unavailable', 'functions/deadline-exceeded'].includes(codigo) &&
    e.message
  ) {
    return e.message;
  }
  return MENSAJES[codigo] ?? 'Ocurrió un error inesperado.';
}

/** true cuando el error es por falta de red: la UI ofrece reintentar en vez de mostrar un fallo. */
export function esErrorDeRed(error: unknown): boolean {
  const codigo = (error as { code?: string })?.code ?? '';
  return [
    'unavailable',
    'firestore/unavailable',
    'functions/unavailable',
    'auth/network-request-failed',
    'storage/retry-limit-exceeded',
  ].includes(codigo);
}
