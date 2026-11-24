/**
 * Seed de datos iniciales (R1) con el Admin SDK.
 *
 *   Emulador:   firebase emulators:exec --project demo-elecciones-epn --only auth,firestore "node seed/seed.mjs --demo"
 *   Producción: GOOGLE_APPLICATION_CREDENTIALS=<clave de servicio> node seed/seed.mjs
 *               (la clave de servicio NUNCA se commitea ni va en la app)
 *
 * Carga: recintos de Pichincha / Quito con sus JRV, 5 organizaciones, 5 candidaturas
 * a alcaldía y 5 a prefectura, y la cuenta del coordinador provincial.
 * Con --demo además crea un coordinador de recinto y dos veedores con mesas asignadas.
 *
 * Es idempotente: se puede correr varias veces sin duplicar.
 * Todas las organizaciones, candidatos y recintos son ficticios.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// firebase-admin se resuelve desde functions/node_modules (no es dependencia de la app).
const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'functions', 'package.json'),
);
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const DEMO = process.argv.includes('--demo');
/** Actas de ejemplo para mostrar el dashboard y las ubicaciones (solo emulador o demo). */
const ACTAS_DEMO = process.argv.includes('--actas-demo');
const PASSWORD_INICIAL = 'Ecuador2026';

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT ?? 'elecciones-epn' });
const db = getFirestore();
const auth = getAuth();

/** Completa 9 dígitos con su verificador módulo 10 (misma regla que domain/cedula.validator.ts). */
function cedula(nueveDigitos) {
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    const p = Number(nueveDigitos[i]) * (i % 2 === 0 ? 2 : 1);
    suma += p > 9 ? p - 9 : p;
  }
  return nueveDigitos + ((10 - (suma % 10)) % 10);
}

const RECINTOS = [
  { id: 'r01', parroquia: 'Iñaquito', nombre: 'Unidad Educativa Los Cedros', numJrv: 6, lat: -0.1762, lng: -78.4812 },
  {
    id: 'r02',
    parroquia: 'Belisario Quevedo',
    nombre: 'Colegio Mirador del Pichincha',
    numJrv: 5,
    lat: -0.2007,
    lng: -78.5031,
  },
  {
    id: 'r03',
    parroquia: 'Chillogallo',
    nombre: 'Escuela Fiscal Nueva Aurora',
    numJrv: 8,
    lat: -0.2794,
    lng: -78.5498,
  },
  {
    id: 'r04',
    parroquia: 'Cotocollao',
    nombre: 'Unidad Educativa Tres Volcanes',
    numJrv: 4,
    lat: -0.1135,
    lng: -78.4975,
  },
  { id: 'r05', parroquia: 'Calderón', nombre: 'Colegio Valle Alto', numJrv: 7, lat: -0.0989, lng: -78.4223 },
  { id: 'r06', parroquia: 'Conocoto', nombre: 'Escuela Río San Pedro', numJrv: 3, lat: -0.2911, lng: -78.4769 },
];

const ORGANIZACIONES = [
  { id: 'o1', nombre: 'Alianza Horizonte', siglas: 'AH', lista: 11 },
  { id: 'o2', nombre: 'Movimiento Raíces', siglas: 'MR', lista: 12 },
  { id: 'o3', nombre: 'Partido Equilibrio', siglas: 'PE', lista: 13 },
  { id: 'o4', nombre: 'Frente Andino Verde', siglas: 'FAV', lista: 14 },
  { id: 'o5', nombre: 'Colectivo Puertas Abiertas', siglas: 'CPA', lista: 15 },
];

const CANDIDATOS = [
  ['o1', 'ALCALDE', 'Andrea Salazar'],
  ['o2', 'ALCALDE', 'Diego Morillo'],
  ['o3', 'ALCALDE', 'Lucía Cevallos'],
  ['o4', 'ALCALDE', 'Mateo Guerrón'],
  ['o5', 'ALCALDE', 'Paola Ruales'],
  ['o1', 'PREFECTO', 'Héctor Viteri'],
  ['o2', 'PREFECTO', 'Gabriela Endara'],
  ['o3', 'PREFECTO', 'Fernando Paredes'],
  ['o4', 'PREFECTO', 'Sofía Almeida'],
  ['o5', 'PREFECTO', 'Ramiro Tapia'],
];

/** Crea (o reutiliza) un usuario de Auth con su perfil, índice de cédula y claims. */
async function asegurarUsuario({ cedula: ced, nombres, apellidos, telefono, email, rol, recintoId }) {
  let uid;
  let nuevo = false;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
  } catch {
    uid = (await auth.createUser({ email, password: PASSWORD_INICIAL, displayName: `${nombres} ${apellidos}` })).uid;
    nuevo = true;
  }
  await auth.setCustomUserClaims(uid, recintoId ? { rol, recintoId } : { rol });
  const lote = db.batch();
  const perfil = { cedula: ced, nombres, apellidos, telefono, email, rol, recintoId: recintoId ?? null };
  // Solo al crear: volver a correr el seed no debe obligar a cambiar otra vez la contraseña.
  if (nuevo)
    Object.assign(perfil, { debeCambiarPassword: true, creadoPor: 'seed', creadoEn: FieldValue.serverTimestamp() });
  lote.set(db.doc(`usuarios/${uid}`), perfil, { merge: true });
  lote.set(db.doc(`cedulas/${ced}`), { uid });
  await lote.commit();
  return uid;
}

async function main() {
  const lote = db.batch();
  for (const o of ORGANIZACIONES)
    lote.set(db.doc(`organizaciones/${o.id}`), { nombre: o.nombre, siglas: o.siglas, lista: o.lista });
  CANDIDATOS.forEach(([organizacionId, dignidad, nombre]) =>
    lote.set(db.doc(`candidatos/${organizacionId}_${dignidad}`), { organizacionId, dignidad, nombre }),
  );
  for (const r of RECINTOS) {
    lote.set(
      db.doc(`recintos/${r.id}`),
      {
        provincia: 'Pichincha',
        canton: 'Quito',
        parroquia: r.parroquia,
        nombre: r.nombre,
        numJrv: r.numJrv,
        lat: r.lat,
        lng: r.lng,
      },
      { merge: true },
    );
    for (let n = 1; n <= r.numJrv; n++) {
      // merge: no pisa un veedor ya asignado si se vuelve a correr el seed.
      lote.set(db.doc(`jrv/${r.id}_${n}`), { recintoId: r.id, numero: n }, { merge: true });
    }
  }
  await lote.commit();

  // Las JRV nuevas necesitan veedorId: null explícito (las reglas y las consultas lo usan).
  const sinVeedor = await db.collection('jrv').get();
  const lote2 = db.batch();
  sinVeedor.docs.filter((d) => d.get('veedorId') === undefined).forEach((d) => lote2.update(d.ref, { veedorId: null }));
  await lote2.commit();

  const provincialEmail = process.env.SEED_PROVINCIAL_EMAIL ?? 'provincial.demo@example.com';
  await asegurarUsuario({
    cedula: cedula('171234567'),
    nombres: 'Coordinación',
    apellidos: 'Provincial Demo',
    telefono: '0990000001',
    email: provincialEmail,
    rol: 'PROVINCIAL',
  });

  const resumen = [`Provincial  cédula ${cedula('171234567')}  (${provincialEmail})`];

  if (DEMO) {
    const coordinador = await asegurarUsuario({
      cedula: cedula('170000001'),
      nombres: 'Rosa',
      apellidos: 'Coordinadora Demo',
      telefono: '0990000002',
      email: 'recinto.demo@example.com',
      rol: 'RECINTO',
      recintoId: 'r01',
    });
    await db.doc('recintos/r01').update({ coordinadorId: coordinador });
    const veedor1 = await asegurarUsuario({
      cedula: cedula('170000002'),
      nombres: 'Luis',
      apellidos: 'Veedor Uno',
      telefono: '0990000003',
      email: 'veedor1.demo@example.com',
      rol: 'VEEDOR',
      recintoId: 'r01',
    });
    const veedor2 = await asegurarUsuario({
      cedula: cedula('170000003'),
      nombres: 'Ana',
      apellidos: 'Veedora Dos',
      telefono: '0990000004',
      email: 'veedor2.demo@example.com',
      rol: 'VEEDOR',
      recintoId: 'r01',
    });
    await db.doc('jrv/r01_1').update({ veedorId: veedor1 });
    await db.doc('jrv/r01_2').update({ veedorId: veedor1 });
    await db.doc('jrv/r01_3').update({ veedorId: veedor2 });
    resumen.push(
      `Recinto r01 cédula ${cedula('170000001')}`,
      `Veedor 1   cédula ${cedula('170000002')}  (JRV r01_1, r01_2)`,
      `Veedor 2   cédula ${cedula('170000003')}  (JRV r01_3)`,
    );
  }

  if (ACTAS_DEMO) {
    const n = await sembrarActasDemo();
    resumen.push(`Actas demo: ${n} (una registrada lejos de su recinto para mostrar la alerta GPS)`);
  }

  const totalJrv = RECINTOS.reduce((s, r) => s + r.numJrv, 0);
  console.log(
    `Seed listo: ${RECINTOS.length} recintos, ${totalJrv} JRV, ${ORGANIZACIONES.length} organizaciones, ${CANDIDATOS.length} candidaturas.`,
  );
  console.log(`Contraseña inicial de todas las cuentas: ${PASSWORD_INICIAL} (se exige cambiarla al entrar).`);
  resumen.forEach((l) => console.log('  ' + l));
}

/**
 * Actas coherentes (los totales cuadran) en varias mesas de r02..r05, fuera de las
 * mesas demo del veedor para no interferir con la prueba manual. Generador
 * determinista: siempre produce los mismos números.
 */
async function sembrarActasDemo() {
  let semilla = 7;
  const azar = (max) => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla % max;
  };
  const lote = db.batch();
  let n = 0;
  for (const r of RECINTOS.filter((x) => ['r02', 'r03', 'r04', 'r05'].includes(x.id))) {
    for (let mesa = 1; mesa <= Math.min(3, r.numJrv); mesa++) {
      for (const dignidad of ['ALCALDE', 'PREFECTO']) {
        const votos = { o1: 40 + azar(80), o2: 30 + azar(70), o3: 10 + azar(50), o4: 5 + azar(30), o5: azar(20) };
        const nulos = azar(12);
        const blancos = azar(10);
        const total = Object.values(votos).reduce((s, v) => s + v, 0) + nulos + blancos;
        // La mesa 1 de r05 se registra a 3 km: el dashboard de ubicaciones debe marcarla.
        const lejos = r.id === 'r05' && mesa === 1;
        const jrvId = `${r.id}_${mesa}`;
        lote.set(db.doc(`actas/${jrvId}_${dignidad}`), {
          jrvId,
          recintoId: r.id,
          dignidad,
          votos,
          nulos,
          blancos,
          totalSufragantes: total,
          fotoPath: null,
          ubicacion: { lat: r.lat + (lejos ? 0.027 : 0.0003), lng: r.lng, precisionM: 8 + azar(20) },
          estado: 'REGISTRADA',
          version: 1,
          registradoPor: 'seed',
          updatedBy: 'seed',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        n++;
      }
    }
  }
  await lote.commit();
  return n;
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
