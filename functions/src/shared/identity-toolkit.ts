/**
 * Llamadas mínimas a la API REST de Firebase Auth (Identity Toolkit v1).
 * Se usan desde el servidor para:
 *  - comprobar una contraseña sin exponer el correo al cliente (login por cédula),
 *  - pedir a Firebase que envíe sus correos de verificación y de reseteo,
 *    con las plantillas configurables en la consola (Authentication > Templates).
 *
 * WEB_API_KEY es la apiKey web del proyecto (pública por diseño). Con el emulador
 * de Auth, FIREBASE_AUTH_EMULATOR_HOST redirige las llamadas a localhost.
 */
import { defineString } from 'firebase-functions/params';

export const WEB_API_KEY = defineString('WEB_API_KEY');

function baseUrl(): string {
  const emulador = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  return emulador
    ? `http://${emulador}/identitytoolkit.googleapis.com/v1`
    : 'https://identitytoolkit.googleapis.com/v1';
}

export class IdentityToolkitError extends Error {
  constructor(readonly codigo: string) {
    super(codigo);
  }
}

async function llamar<T>(metodo: string, cuerpo: Record<string, unknown>): Promise<T> {
  const respuesta = await fetch(`${baseUrl()}/accounts:${metodo}?key=${WEB_API_KEY.value()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const json = (await respuesta.json()) as T & { error?: { message?: string } };
  if (!respuesta.ok) {
    // Los mensajes vienen como "INVALID_LOGIN_CREDENTIALS" o "TOO_MANY_ATTEMPTS_TRY_LATER : ..."
    const codigo = (json.error?.message ?? 'DESCONOCIDO').split(' ')[0];
    throw new IdentityToolkitError(codigo);
  }
  return json;
}

/** Devuelve el uid si la contraseña es correcta; lanza IdentityToolkitError si no. */
export async function verificarPassword(email: string, password: string): Promise<string> {
  const r = await llamar<{ localId: string }>('signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });
  return r.localId;
}

/** Envía el correo de restablecimiento de contraseña de Firebase. */
export async function enviarCorreoReseteo(email: string): Promise<void> {
  await llamar('sendOobCode', { requestType: 'PASSWORD_RESET', email });
}

/**
 * Envía el correo de verificación (confirmación de cuenta, R2). La API lo exige
 * en nombre del propio usuario, así que se canjea un custom token por un idToken.
 */
export async function enviarCorreoVerificacion(customToken: string): Promise<void> {
  const { idToken } = await llamar<{ idToken: string }>('signInWithCustomToken', {
    token: customToken,
    returnSecureToken: true,
  });
  await llamar('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken });
}
