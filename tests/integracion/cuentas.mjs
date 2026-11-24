/**
 * Prueba de integración de cuentas y acceso (R2, R3) contra los emuladores,
 * usando el SDK cliente igual que la app.
 *
 *   npm --prefix functions run build
 *   firebase emulators:exec --project demo-elecciones-epn --only auth,firestore,functions \
 *     "node seed/seed.mjs --demo && node tests/integracion/cuentas.mjs"
 */
import assert from 'node:assert/strict';

import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-elecciones-epn' });
const auth = getAuth(app);
const db = getFirestore(app);
const fns = getFunctions(app, 'us-central1');
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8085);
connectFunctionsEmulator(fns, '127.0.0.1', 5001);

const loginCedula = httpsCallable(fns, 'loginCedula');
const crearUsuario = httpsCallable(fns, 'crearUsuario');
const cambiarPassword = httpsCallable(fns, 'cambiarPassword');
const recuperarPassword = httpsCallable(fns, 'recuperarPassword');

const CED = { recinto: '1700000019', veedor1: '1700000027', provincial: '1712345675' };
let ok = 0;

async function caso(nombre, fn) {
  try {
    await fn();
    ok++;
    console.log(`  ok  ${nombre}`);
  } catch (e) {
    console.error(`  FALLA  ${nombre}\n        ${e.code ?? ''} ${e.message}`);
    process.exitCode = 1;
  }
}

async function entrar(cedula, password) {
  const { data } = await loginCedula({ cedula, password });
  return (await signInWithCustomToken(auth, data.token)).user;
}

async function esperaError(promesa, codigo) {
  await assert.rejects(promesa, (e) => {
    assert.equal(e.code, `functions/${codigo}`);
    return true;
  });
}

console.log('Cuentas y acceso:');

await caso('login con cédula y contraseña inicial', async () => {
  const user = await entrar(CED.veedor1, 'Ecuador2026');
  const claims = (await user.getIdTokenResult()).claims;
  assert.equal(claims.rol, 'VEEDOR');
  assert.equal(claims.recintoId, 'r01');
  await signOut(auth);
});

await caso('login con contraseña incorrecta da error genérico', async () => {
  await esperaError(loginCedula({ cedula: CED.veedor1, password: 'otra' }), 'unauthenticated');
});

await caso('login con cédula no registrada da el mismo error genérico', async () => {
  await esperaError(loginCedula({ cedula: '0912345675', password: 'Ecuador2026' }), 'unauthenticated');
});

await caso('crearUsuario sin sesión es rechazado', async () => {
  await esperaError(crearUsuario({}), 'unauthenticated');
});

await caso('coordinador de recinto crea un veedor de su recinto', async () => {
  await entrar(CED.recinto, 'Ecuador2026');
  const { data } = await crearUsuario({
    cedula: '0912345675', nombres: 'Nuevo', apellidos: 'Veedor', telefono: '0991112233',
    email: 'nuevo.veedor@example.com', rol: 'VEEDOR',
  });
  assert.ok(data.uid);
});

await caso('cédula repetida es rechazada', async () => {
  await esperaError(
    crearUsuario({ cedula: '0912345675', nombres: 'Otro', apellidos: 'Veedor', telefono: '0991112234', email: 'otro@example.com', rol: 'VEEDOR' }),
    'already-exists',
  );
});

await caso('coordinador de recinto NO puede crear otro coordinador', async () => {
  await esperaError(
    crearUsuario({ cedula: '2405123452', nombres: 'X', apellidos: 'Y', telefono: '0991112235', email: 'x@example.com', rol: 'RECINTO', recintoId: 'r02' }),
    'permission-denied',
  );
});

await caso('cédula inválida es rechazada en el servidor', async () => {
  await esperaError(
    crearUsuario({ cedula: '1712345670', nombres: 'X', apellidos: 'Y', telefono: '0991112235', email: 'x@example.com', rol: 'VEEDOR' }),
    'invalid-argument',
  );
  await signOut(auth);
});

await caso('provincial crea el coordinador de un recinto libre', async () => {
  await entrar(CED.provincial, 'Ecuador2026');
  const { data } = await crearUsuario({
    cedula: '2405123452', nombres: 'Marta', apellidos: 'Coordinadora', telefono: '0991112236',
    email: 'marta.r02@example.com', rol: 'RECINTO', recintoId: 'r02',
  });
  assert.ok(data.uid);
});

await caso('un recinto no admite dos coordinadores', async () => {
  await esperaError(
    crearUsuario({ cedula: '3000000012', nombres: 'Z', apellidos: 'Z', telefono: '0991112237', email: 'z@example.com', rol: 'RECINTO', recintoId: 'r01' }),
    'already-exists',
  );
  await signOut(auth);
});

await caso('cambio de contraseña: rechaza una débil y acepta una segura', async () => {
  await entrar(CED.veedor1, 'Ecuador2026');
  await esperaError(cambiarPassword({ nueva: 'Ecuador2026' }), 'invalid-argument');
  await esperaError(cambiarPassword({ nueva: 'corta' }), 'invalid-argument');
  await cambiarPassword({ nueva: 'Segura2026x' });
  await signOut(auth);
  await esperaError(loginCedula({ cedula: CED.veedor1, password: 'Ecuador2026' }), 'unauthenticated');
  await entrar(CED.veedor1, 'Segura2026x');
});

await caso('el veedor registra un acta y queda auditada (trigger)', async () => {
  await setDoc(doc(db, 'actas/r01_1_ALCALDE'), {
    jrvId: 'r01_1', recintoId: 'r01', dignidad: 'ALCALDE',
    votos: { o1: 50, o2: 30, o3: 10, o4: 5, o5: 3 }, nulos: 1, blancos: 1, totalSufragantes: 100,
    fotoPath: null, ubicacion: { lat: -0.1762, lng: -78.4812, precisionM: 8 },
    estado: 'REGISTRADA', version: 1, registradoPor: auth.currentUser.uid, updatedBy: auth.currentUser.uid,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await signOut(auth);

  // El trigger corre de forma asíncrona: el coordinador del recinto consulta hasta verlo.
  await entrar(CED.recinto, 'Ecuador2026');
  const q = query(collection(db, 'auditoria'), where('recintoId', '==', 'r01'), where('actaId', '==', 'r01_1_ALCALDE'));
  let registros = 0;
  for (let i = 0; i < 20 && registros === 0; i++) {
    registros = (await getDocs(q)).size;
    if (registros === 0) await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(registros, 1);
  await signOut(auth);
});

await caso('recuperar contraseña responde igual exista o no la cédula', async () => {
  const a = await recuperarPassword({ cedula: CED.veedor1 });
  const b = await recuperarPassword({ cedula: '0100000009' });
  assert.equal(a.data.mensaje, b.data.mensaje);
});

console.log(`\n${ok} casos correctos.`);
process.exit(process.exitCode ?? 0);
