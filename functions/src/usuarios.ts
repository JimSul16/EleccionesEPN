/**
 * Cuentas y acceso (R2, R3). Todo lo que necesita privilegios de administrador
 * ocurre aquí, en el servidor: la app nunca tiene la cuenta de servicio.
 */
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';

import {
  enviarCorreoReseteo,
  enviarCorreoVerificacion,
  IdentityToolkitError,
  verificarPassword,
} from './shared/identity-toolkit';
import {
  esCedulaValida,
  esEmailValido,
  esPasswordSegura,
  esTelefonoValido,
  esTextoValido,
  PASSWORD_INICIAL,
  puedeCrear,
  type Rol,
} from './shared/validaciones';

const ROLES: Rol[] = ['PROVINCIAL', 'RECINTO', 'VEEDOR'];

interface Claims {
  rol?: Rol;
  recintoId?: string;
}

function claimsDe(request: CallableRequest): Claims & { uid: string } {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Inicie sesión.');
  const token = request.auth.token as Claims;
  return { uid: request.auth.uid, rol: token.rol, recintoId: token.recintoId };
}

// ---------------------------------------------------------------------------
// crearUsuario: PROVINCIAL crea coordinadores de recinto; RECINTO crea veedores.
// ---------------------------------------------------------------------------

interface DatosNuevoUsuario {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  rol: Rol;
  /** Solo para RECINTO (lo elige el provincial). Para VEEDOR se usa el recinto del creador. */
  recintoId?: string;
}

function validarDatos(d: Partial<DatosNuevoUsuario>): asserts d is DatosNuevoUsuario {
  if (!esCedulaValida(d.cedula)) throw new HttpsError('invalid-argument', 'Cédula no válida.');
  if (!esTextoValido(d.nombres) || !esTextoValido(d.apellidos)) {
    throw new HttpsError('invalid-argument', 'Nombres y apellidos son obligatorios.');
  }
  if (!esTelefonoValido(d.telefono)) throw new HttpsError('invalid-argument', 'Teléfono no válido (09XXXXXXXX).');
  if (!esEmailValido(d.email)) throw new HttpsError('invalid-argument', 'Correo no válido.');
  if (!d.rol || !ROLES.includes(d.rol)) throw new HttpsError('invalid-argument', 'Rol no válido.');
}

export const crearUsuario = onCall(async (request) => {
  const creador = claimsDe(request);
  const datos = (request.data ?? {}) as Partial<DatosNuevoUsuario>;
  validarDatos(datos);

  if (!creador.rol || !puedeCrear(creador.rol, datos.rol)) {
    throw new HttpsError('permission-denied', 'Su rol no puede crear este tipo de cuenta.');
  }

  const db = getFirestore();
  const recintoId = datos.rol === 'VEEDOR' ? creador.recintoId : datos.recintoId;
  if (!recintoId) throw new HttpsError('invalid-argument', 'Falta el recinto.');

  const recintoRef = db.doc(`recintos/${recintoId}`);
  const recinto = await recintoRef.get();
  if (!recinto.exists) throw new HttpsError('not-found', 'El recinto no existe.');
  if (datos.rol === 'RECINTO' && recinto.get('coordinadorId')) {
    throw new HttpsError('already-exists', 'El recinto ya tiene coordinador.');
  }

  // Reservar la cédula primero: create() falla si ya existe, así no hay duplicados
  // aunque dos coordinadores creen la misma cuenta a la vez.
  const cedulaRef = db.doc(`cedulas/${datos.cedula}`);
  try {
    await cedulaRef.create({ reservadaEn: FieldValue.serverTimestamp() });
  } catch {
    throw new HttpsError('already-exists', 'Ya existe una cuenta con esa cédula.');
  }

  const auth = getAuth();
  let uid: string;
  try {
    const usuario = await auth.createUser({
      email: datos.email.trim().toLowerCase(),
      password: PASSWORD_INICIAL,
      displayName: `${datos.nombres.trim()} ${datos.apellidos.trim()}`,
    });
    uid = usuario.uid;
  } catch (error) {
    await cedulaRef.delete();
    const codigo = (error as { code?: string }).code;
    if (codigo === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.');
    }
    logger.error('createUser falló', error);
    throw new HttpsError('internal', 'No se pudo crear la cuenta.');
  }

  await auth.setCustomUserClaims(uid, { rol: datos.rol, recintoId });

  const lote = db.batch();
  lote.set(db.doc(`usuarios/${uid}`), {
    cedula: datos.cedula,
    nombres: datos.nombres.trim(),
    apellidos: datos.apellidos.trim(),
    telefono: datos.telefono,
    email: datos.email.trim().toLowerCase(),
    rol: datos.rol,
    recintoId,
    debeCambiarPassword: true,
    creadoPor: creador.uid,
    creadoEn: FieldValue.serverTimestamp(),
  });
  lote.set(cedulaRef, { uid });
  if (datos.rol === 'RECINTO') lote.update(recintoRef, { coordinadorId: uid });
  await lote.commit();

  // Confirmación de cuenta (R2). Si el correo falla la cuenta ya existe: se
  // informa pero no se deshace.
  let correoEnviado = true;
  try {
    await enviarCorreoVerificacion(await auth.createCustomToken(uid));
  } catch (error) {
    correoEnviado = false;
    logger.warn('No se pudo enviar la verificación', { uid, error: String(error) });
  }

  return { uid, correoEnviado };
});

// ---------------------------------------------------------------------------
// loginCedula: la cédula es el identificador visible (R3). El correo nunca sale
// del servidor; se devuelve un custom token para signInWithCustomToken.
// ---------------------------------------------------------------------------

const CREDENCIALES_INCORRECTAS = 'Cédula o contraseña incorrecta.';

async function emailPorCedula(cedula: string): Promise<{ uid: string; email: string } | null> {
  const db = getFirestore();
  const indice = await db.doc(`cedulas/${cedula}`).get();
  const uid = indice.get('uid') as string | undefined;
  if (!uid) return null;
  const usuario = await db.doc(`usuarios/${uid}`).get();
  const email = usuario.get('email') as string | undefined;
  return email ? { uid, email } : null;
}

export const loginCedula = onCall(async (request) => {
  const { cedula, password } = (request.data ?? {}) as { cedula?: unknown; password?: unknown };
  if (!esCedulaValida(cedula) || typeof password !== 'string' || password.length === 0) {
    throw new HttpsError('unauthenticated', CREDENCIALES_INCORRECTAS);
  }

  const cuenta = await emailPorCedula(cedula as string);
  if (!cuenta) throw new HttpsError('unauthenticated', CREDENCIALES_INCORRECTAS);

  try {
    const uid = await verificarPassword(cuenta.email, password);
    if (uid !== cuenta.uid) throw new HttpsError('unauthenticated', CREDENCIALES_INCORRECTAS);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof IdentityToolkitError && error.codigo === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
      throw new HttpsError('resource-exhausted', 'Demasiados intentos. Espere unos minutos.');
    }
    if (error instanceof IdentityToolkitError && error.codigo === 'USER_DISABLED') {
      throw new HttpsError('permission-denied', 'La cuenta está deshabilitada.');
    }
    throw new HttpsError('unauthenticated', CREDENCIALES_INCORRECTAS);
  }

  const token = await getAuth().createCustomToken(cuenta.uid);
  return { token };
});

// ---------------------------------------------------------------------------
// recuperarPassword: respuesta siempre igual para no revelar qué cédulas existen.
// ---------------------------------------------------------------------------

export const recuperarPassword = onCall(async (request) => {
  const { cedula } = (request.data ?? {}) as { cedula?: unknown };
  if (esCedulaValida(cedula)) {
    const cuenta = await emailPorCedula(cedula as string);
    if (cuenta) {
      try {
        await enviarCorreoReseteo(cuenta.email);
      } catch (error) {
        logger.warn('No se pudo enviar el reseteo', { uid: cuenta.uid, error: String(error) });
      }
    }
  }
  return { mensaje: 'Si la cédula está registrada, se envió un correo para restablecer la contraseña.' };
});

// ---------------------------------------------------------------------------
// cambiarPassword: cambio obligatorio en el primer acceso (R3). Se hace en el
// servidor para validar la política y limpiar la bandera en el mismo paso.
// ---------------------------------------------------------------------------

export const cambiarPassword = onCall(async (request) => {
  const { uid } = claimsDe(request);
  const { nueva } = (request.data ?? {}) as { nueva?: unknown };
  if (!esPasswordSegura(nueva)) {
    throw new HttpsError(
      'invalid-argument',
      'La contraseña debe tener 8 caracteres, mayúscula, minúscula, número y ser distinta de la inicial.',
    );
  }
  await getAuth().updateUser(uid, { password: nueva });
  await getFirestore().doc(`usuarios/${uid}`).update({
    debeCambiarPassword: false,
    passwordCambiadaEn: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});
