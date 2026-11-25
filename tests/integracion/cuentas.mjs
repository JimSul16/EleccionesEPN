/**
 * Prueba de integración de cuentas y acceso (R2, R3) contra los emuladores de
 * Auth y Firestore, con el SDK cliente y los mismos pasos que la app
 * (plan gratuito Spark, ADR-018: sin Cloud Functions).
 *
 *   firebase emulators:exec --project demo-elecciones-epn --only auth,firestore \
 *     "node seed/seed.mjs --demo && node tests/integracion/cuentas.mjs"
 */
import assert from 'node:assert/strict';

import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const config = { apiKey: 'demo-key', projectId: 'demo-elecciones-epn' };
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8085);

const CED = { recinto: '1700000019', veedor1: '1700000027', provincial: '1712345675' };
const INICIAL = 'Ecuador2026';
let ok = 0;

async function caso(nombre, fn) {
  try {
    await fn();
    ok++;
    console.log(`  ok  ${nombre}`);
  } catch (e) {
    console.error(`  FALLA  ${nombre}\n        ${e.code ?? ''} ${e.message}`);
    process.exitCode = 1;
  } finally {
    if (auth.currentUser) await signOut(auth);
  }
}

/** Igual que AuthService.login: cédula -> correo (cedulas/{cédula}) -> login. */
async function entrar(cedula, password) {
  const indice = await getDoc(doc(db, 'cedulas', cedula));
  if (!indice.exists()) throw Object.assign(new Error('cédula no registrada'), { code: 'login/sin-cedula' });
  return (await signInWithEmailAndPassword(auth, indice.get('email'), password)).user;
}

/** Igual que UsuarioRepository.crear: cuenta en instancia secundaria + lote validado por las reglas. */
async function crearCuenta({ cedula, email, rol, recintoId, asignarRecinto }) {
  const sec = initializeApp(config, `alta-${Date.now()}-${Math.random()}`);
  const secAuth = getAuth(sec);
  connectAuthEmulator(secAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  try {
    const nueva = (await createUserWithEmailAndPassword(secAuth, email, INICIAL)).user;
    const lote = writeBatch(db);
    lote.set(doc(db, 'usuarios', nueva.uid), {
      cedula,
      nombres: 'Prueba',
      apellidos: 'Integración',
      telefono: '0991112233',
      email,
      rol,
      recintoId,
      debeCambiarPassword: true,
      creadoPor: auth.currentUser.uid,
      creadoEn: serverTimestamp(),
    });
    lote.set(doc(db, 'cedulas', cedula), { uid: nueva.uid, email });
    if (asignarRecinto) lote.update(doc(db, 'recintos', asignarRecinto), { coordinadorId: nueva.uid });
    try {
      await lote.commit();
    } catch (e) {
      await nueva.delete();
      throw e;
    }
    await sendEmailVerification(nueva);
    return nueva.uid;
  } finally {
    await deleteApp(sec);
  }
}

/** Credenciales incorrectas: según la configuración, Auth responde con uno de estos códigos. */
const CREDENCIAL_INVALIDA = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'];

async function esperaFallo(promesa, codigo) {
  const aceptados = codigo === 'auth/invalid-credential' ? CREDENCIAL_INVALIDA : [codigo];
  await assert.rejects(promesa, (e) => {
    assert.ok(aceptados.includes(e.code), `código inesperado: ${e.code}`);
    return true;
  });
}

console.log('Cuentas y acceso (plan gratuito, sin Functions):');

await caso('login con cédula y contraseña inicial; el rol sale del perfil', async () => {
  const user = await entrar(CED.veedor1, INICIAL);
  const perfil = await getDoc(doc(db, 'usuarios', user.uid));
  assert.equal(perfil.get('rol'), 'VEEDOR');
  assert.equal(perfil.get('recintoId'), 'r01');
  assert.equal(perfil.get('debeCambiarPassword'), true);
});

await caso('login con contraseña incorrecta es rechazado', async () => {
  await esperaFallo(entrar(CED.veedor1, 'otra'), 'auth/invalid-credential');
});

await caso('una cédula no registrada no tiene correo asociado', async () => {
  await esperaFallo(entrar('0912345675', INICIAL), 'login/sin-cedula');
});

await caso('el coordinador de recinto crea un veedor de su recinto (y se envía la verificación)', async () => {
  await entrar(CED.recinto, INICIAL);
  const uid = await crearCuenta({
    cedula: '0912345675',
    email: 'nuevo.veedor@example.com',
    rol: 'VEEDOR',
    recintoId: 'r01',
  });
  assert.ok(uid);
});

await caso('el veedor nuevo inicia sesión con su cédula', async () => {
  const user = await entrar('0912345675', INICIAL);
  assert.equal((await getDoc(doc(db, 'usuarios', user.uid))).get('rol'), 'VEEDOR');
});

await caso('una cédula repetida es rechazada y no deja cuenta huérfana', async () => {
  await entrar(CED.recinto, INICIAL);
  await esperaFallo(
    crearCuenta({ cedula: '0912345675', email: 'otro@example.com', rol: 'VEEDOR', recintoId: 'r01' }),
    'permission-denied',
  );
  await signOut(auth);
  await esperaFallo(signInWithEmailAndPassword(auth, 'otro@example.com', INICIAL), 'auth/invalid-credential');
});

await caso('el coordinador de recinto NO puede crear otro coordinador', async () => {
  await entrar(CED.recinto, INICIAL);
  await esperaFallo(
    crearCuenta({
      cedula: '2405123452',
      email: 'x@example.com',
      rol: 'RECINTO',
      recintoId: 'r02',
      asignarRecinto: 'r02',
    }),
    'permission-denied',
  );
});

await caso('el provincial crea el coordinador de un recinto libre', async () => {
  await entrar(CED.provincial, INICIAL);
  await crearCuenta({
    cedula: '2405123452',
    email: 'marta.r02@example.com',
    rol: 'RECINTO',
    recintoId: 'r02',
    asignarRecinto: 'r02',
  });
  assert.ok((await getDoc(doc(db, 'recintos', 'r02'))).get('coordinadorId'));
});

await caso('un recinto no admite dos coordinadores', async () => {
  await entrar(CED.provincial, INICIAL);
  await esperaFallo(
    crearCuenta({
      cedula: '3000000012',
      email: 'z@example.com',
      rol: 'RECINTO',
      recintoId: 'r01',
      asignarRecinto: 'r01',
    }),
    'permission-denied',
  );
});

await caso('cambio de contraseña: queda registrado y la inicial deja de servir', async () => {
  const user = await entrar(CED.veedor1, INICIAL);
  await updatePassword(user, 'Segura2026x');
  await updateDoc(doc(db, 'usuarios', user.uid), { debeCambiarPassword: false, passwordCambiadaEn: serverTimestamp() });
  await signOut(auth);
  await esperaFallo(entrar(CED.veedor1, INICIAL), 'auth/invalid-credential');
  const otra = await entrar(CED.veedor1, 'Segura2026x');
  assert.equal((await getDoc(doc(db, 'usuarios', otra.uid))).get('debeCambiarPassword'), false);
});

await caso('el veedor registra un acta con foto y auditoría en un solo lote', async () => {
  const user = await entrar(CED.veedor1, 'Segura2026x');
  const lote = writeBatch(db);
  lote.set(doc(db, 'fotos', 'r01_1_ALCALDE_prueba1'), {
    actaId: 'r01_1_ALCALDE',
    jrvId: 'r01_1',
    recintoId: 'r01',
    dignidad: 'ALCALDE',
    mime: 'image/jpeg',
    imagen: '/9j/4AAQSkZJRgABAQ',
    bytes: 13,
    creadoPor: user.uid,
    creadoEn: serverTimestamp(),
  });
  const conteo = { votos: { o1: 50, o2: 30, o3: 10, o4: 5, o5: 3 }, nulos: 1, blancos: 1, totalSufragantes: 100 };
  lote.set(doc(db, 'actas', 'r01_1_ALCALDE'), {
    jrvId: 'r01_1',
    recintoId: 'r01',
    dignidad: 'ALCALDE',
    ...conteo,
    fotoPath: 'fotos/r01_1_ALCALDE_prueba1',
    ubicacion: { lat: -0.1762, lng: -78.4812, precisionM: 8 },
    estado: 'REGISTRADA',
    version: 1,
    registradoPor: user.uid,
    updatedBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  lote.set(doc(collection(db, 'auditoria')), {
    actaId: 'r01_1_ALCALDE',
    recintoId: 'r01',
    usuario: user.uid,
    accion: 'CREAR',
    version: 1,
    antes: null,
    despues: conteo,
    fecha: serverTimestamp(),
  });
  await lote.commit();
  await signOut(auth);

  await entrar(CED.recinto, INICIAL);
  const q = query(collection(db, 'auditoria'), where('recintoId', '==', 'r01'), where('actaId', '==', 'r01_1_ALCALDE'));
  assert.equal((await getDocs(q)).size, 1);
});

await caso('una cuenta creada fuera de la jerarquía (sin perfil) no accede a nada', async () => {
  await createUserWithEmailAndPassword(auth, 'intruso@example.com', 'Intruso2026x');
  await esperaFallo(
    getDocs(query(collection(db, 'jrv'), where('veedorId', '==', auth.currentUser.uid))),
    'permission-denied',
  );
  await esperaFallo(getDoc(doc(db, 'organizaciones', 'o1')), 'permission-denied');
});

await caso('recuperar contraseña envía el correo a la cuenta de esa cédula', async () => {
  const indice = await getDoc(doc(db, 'cedulas', CED.veedor1));
  await sendPasswordResetEmail(auth, indice.get('email'));
});

console.log(`\n${ok} casos correctos.`);
process.exit(process.exitCode ?? 0);
