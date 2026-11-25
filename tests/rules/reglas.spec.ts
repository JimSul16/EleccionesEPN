/**
 * Pruebas de las reglas de seguridad (R8) contra el emulador de Firestore.
 * Plan gratuito Spark (ADR-018): roles en usuarios/{uid}, fotos en la colección
 * fotos, alta de cuentas y auditoría escritas por la app y validadas aquí.
 *
 * Ejecutar:  npm run test:rules
 */
import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const veedorA = () => env.authenticatedContext('vA').firestore() as unknown as Firestore;
const veedorB = () => env.authenticatedContext('vB').firestore() as unknown as Firestore;
const coordR1 = () => env.authenticatedContext('cR1').firestore() as unknown as Firestore;
const coordR2 = () => env.authenticatedContext('cR2').firestore() as unknown as Firestore;
const provincial = () => env.authenticatedContext('p1').firestore() as unknown as Firestore;
const sinPerfil = () => env.authenticatedContext('intruso').firestore() as unknown as Firestore;
const anonimo = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

function acta(jrvId: string, uid: string, extra: Record<string, unknown> = {}) {
  return {
    jrvId,
    recintoId: 'r1',
    dignidad: 'ALCALDE',
    votos: { o1: 10, o2: 5, o3: 3, o4: 2, o5: 0 },
    nulos: 1,
    blancos: 1,
    totalSufragantes: 22,
    fotoPath: null,
    ubicacion: { lat: -0.21, lng: -78.49, precisionM: 12 },
    estado: 'REGISTRADA',
    version: 1,
    registradoPor: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  };
}

function foto(jrvId: string, uid: string, extra: Record<string, unknown> = {}) {
  return {
    actaId: `${jrvId}_ALCALDE`,
    jrvId,
    recintoId: 'r1',
    dignidad: 'ALCALDE',
    mime: 'image/jpeg',
    imagen: '/9j/4AAQSkZJRgABAQ',
    bytes: 13,
    creadoPor: uid,
    creadoEn: serverTimestamp(),
    ...extra,
  };
}

function perfilNuevo(rol: string, recintoId: string, creadoPor: string, extra: Record<string, unknown> = {}) {
  return {
    cedula: '0912345675',
    nombres: 'Nuevo',
    apellidos: 'Usuario',
    telefono: '0991112233',
    email: 'nuevo@example.com',
    rol,
    recintoId,
    debeCambiarPassword: true,
    creadoPor,
    creadoEn: serverTimestamp(),
    ...extra,
  };
}

/** Alta de cuenta como la hace la app: perfil + índice de cédula (+ recinto) en un lote. */
function alta(db: Firestore, nuevoUid: string, perfil: Record<string, unknown>, asignarRecinto?: string) {
  const lote = writeBatch(db);
  lote.set(doc(db, `usuarios/${nuevoUid}`), perfil);
  lote.set(doc(db, `cedulas/${perfil['cedula']}`), { uid: nuevoUid, email: perfil['email'] });
  if (asignarRecinto) lote.update(doc(db, `recintos/${asignarRecinto}`), { coordinadorId: nuevoUid });
  return lote.commit();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-elecciones-epn',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'recintos/r1'), { nombre: 'Recinto 1', numJrv: 2, coordinadorId: 'cR1' });
    await setDoc(doc(db, 'recintos/r2'), { nombre: 'Recinto 2', numJrv: 1, coordinadorId: 'cR2' });
    await setDoc(doc(db, 'recintos/r3'), { nombre: 'Recinto 3', numJrv: 1, coordinadorId: null });
    await setDoc(doc(db, 'jrv/r1_1'), { recintoId: 'r1', numero: 1, veedorId: 'vA' });
    await setDoc(doc(db, 'jrv/r1_2'), { recintoId: 'r1', numero: 2, veedorId: 'vB' });
    await setDoc(doc(db, 'jrv/r2_1'), { recintoId: 'r2', numero: 1, veedorId: 'vC' });
    await setDoc(doc(db, 'usuarios/p1'), { rol: 'PROVINCIAL', recintoId: null });
    await setDoc(doc(db, 'usuarios/cR1'), { rol: 'RECINTO', recintoId: 'r1' });
    await setDoc(doc(db, 'usuarios/cR2'), { rol: 'RECINTO', recintoId: 'r2' });
    await setDoc(doc(db, 'usuarios/vA'), { rol: 'VEEDOR', recintoId: 'r1', debeCambiarPassword: true });
    await setDoc(doc(db, 'usuarios/vB'), { rol: 'VEEDOR', recintoId: 'r1' });
    await setDoc(doc(db, 'usuarios/vC'), { rol: 'VEEDOR', recintoId: 'r2' });
    await setDoc(doc(db, 'cedulas/1700000027'), { uid: 'vA', email: 'vA@example.com' });
    await setDoc(doc(db, 'organizaciones/o1'), { nombre: 'Org 1', siglas: 'O1', lista: 11 });
    await setDoc(doc(db, 'actas/r1_2_ALCALDE'), acta('r1_2', 'vB'));
    await setDoc(doc(db, 'fotos/r1_2_ALCALDE_abc'), foto('r1_2', 'vB', { actaId: 'r1_2_ALCALDE' }));
  });
});

describe('Veedor: aislamiento de mesas (R8)', () => {
  it('lee su propia mesa', async () => {
    await assertSucceeds(getDoc(doc(veedorA(), 'jrv/r1_1')));
  });

  it('NO lee la mesa de otro veedor', async () => {
    await assertFails(getDoc(doc(veedorA(), 'jrv/r1_2')));
  });

  it('lista solo con el filtro de su uid', async () => {
    const db = veedorA();
    await assertSucceeds(getDocs(query(collection(db, 'jrv'), where('veedorId', '==', 'vA'))));
    await assertFails(getDocs(collection(db, 'jrv')));
  });

  it('NO lee el acta de una mesa ajena', async () => {
    await assertFails(getDoc(doc(veedorA(), 'actas/r1_2_ALCALDE')));
  });

  it('consulta un acta todavía no registrada de su mesa (no existe)', async () => {
    await assertSucceeds(getDoc(doc(veedorA(), 'actas/r1_1_PREFECTO')));
  });

  it('NO consulta un acta no registrada de una mesa ajena', async () => {
    await assertFails(getDoc(doc(veedorA(), 'actas/r1_2_PREFECTO')));
  });

  it('el coordinador consulta un acta no registrada de su recinto, pero no de otro', async () => {
    await assertSucceeds(getDoc(doc(coordR1(), 'actas/r1_1_PREFECTO')));
    await assertFails(getDoc(doc(coordR2(), 'actas/r1_1_PREFECTO')));
  });

  it('el dueño sí lee su acta', async () => {
    await assertSucceeds(getDoc(doc(veedorB(), 'actas/r1_2_ALCALDE')));
  });

  it('registra el acta de su mesa', async () => {
    await assertSucceeds(setDoc(doc(veedorA(), 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA')));
  });

  it('NO registra un acta en una mesa ajena', async () => {
    await assertFails(setDoc(doc(veedorA(), 'actas/r1_2_PREFECTO'), { ...acta('r1_2', 'vA'), dignidad: 'PREFECTO' }));
  });
});

describe('Actas: validaciones en el servidor (R6)', () => {
  it('rechaza un acta cuyos totales no cuadran', async () => {
    await assertFails(setDoc(doc(veedorA(), 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { totalSufragantes: 30 })));
  });

  it('rechaza votos negativos o decimales', async () => {
    const db = veedorA();
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { nulos: -1, totalSufragantes: 20 })));
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { nulos: 1.5, blancos: 0.5 })));
  });

  it('rechaza un id que no coincide con mesa y dignidad', async () => {
    await assertFails(setDoc(doc(veedorA(), 'actas/otro_id'), acta('r1_1', 'vA')));
  });

  it('rechaza falsificar registradoPor o recintoId', async () => {
    const db = veedorA();
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { registradoPor: 'vB' })));
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { recintoId: 'r2' })));
  });

  it('rechaza una fotoPath que no es de esa acta', async () => {
    await assertFails(
      setDoc(doc(veedorA(), 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { fotoPath: 'fotos/r1_2_ALCALDE_abc' })),
    );
    await assertSucceeds(
      setDoc(doc(veedorA(), 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { fotoPath: 'fotos/r1_1_ALCALDE_x1' })),
    );
  });

  it('corrección: exige version + 1 (detecta conflictos)', async () => {
    const ref1 = doc(veedorB(), 'actas/r1_2_ALCALDE');
    const cambios = { nulos: 2, blancos: 0, estado: 'CORREGIDA', updatedBy: 'vB', updatedAt: serverTimestamp() };
    await assertFails(updateDoc(ref1, { ...cambios, version: 1 }));
    await assertFails(updateDoc(ref1, { ...cambios, version: 3 }));
    await assertSucceeds(updateDoc(ref1, { ...cambios, version: 2 }));
  });

  it('el provincial solo lee actas', async () => {
    const db = provincial();
    await assertSucceeds(getDoc(doc(db, 'actas/r1_2_ALCALDE')));
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'p1')));
  });
});

describe('Fotos de actas en Firestore (R7, R8)', () => {
  it('el veedor guarda la foto de su mesa', async () => {
    await assertSucceeds(setDoc(doc(veedorA(), 'fotos/r1_1_ALCALDE_u1'), foto('r1_1', 'vA')));
  });

  it('NO guarda fotos de una mesa ajena', async () => {
    await assertFails(setDoc(doc(veedorA(), 'fotos/r1_2_ALCALDE_u1'), foto('r1_2', 'vA', { actaId: 'r1_2_ALCALDE' })));
  });

  it('NO acepta otro formato ni una imagen demasiado grande', async () => {
    const db = veedorA();
    await assertFails(setDoc(doc(db, 'fotos/r1_1_ALCALDE_u1'), foto('r1_1', 'vA', { mime: 'image/png' })));
    await assertFails(setDoc(doc(db, 'fotos/r1_1_ALCALDE_u2'), foto('r1_1', 'vA', { imagen: 'A'.repeat(960_000) })));
  });

  it('lee la foto el dueño de la mesa, el coordinador y el provincial; no otro veedor', async () => {
    await assertSucceeds(getDoc(doc(veedorB(), 'fotos/r1_2_ALCALDE_abc')));
    await assertSucceeds(getDoc(doc(coordR1(), 'fotos/r1_2_ALCALDE_abc')));
    await assertSucceeds(getDoc(doc(provincial(), 'fotos/r1_2_ALCALDE_abc')));
    await assertFails(getDoc(doc(veedorA(), 'fotos/r1_2_ALCALDE_abc')));
    await assertFails(getDoc(doc(coordR2(), 'fotos/r1_2_ALCALDE_abc')));
  });

  it('una foto no se sobrescribe ni se lista', async () => {
    await assertFails(updateDoc(doc(veedorB(), 'fotos/r1_2_ALCALDE_abc'), { bytes: 1 }));
    await assertFails(getDocs(collection(provincial(), 'fotos')));
  });
});

describe('Auditoría escrita por la app (R5, R6)', () => {
  it('se acepta en el mismo lote que el acta', async () => {
    const db = veedorA();
    const lote = writeBatch(db);
    lote.set(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA'));
    lote.set(doc(collection(db, 'auditoria')), {
      actaId: 'r1_1_ALCALDE',
      recintoId: 'r1',
      usuario: 'vA',
      accion: 'CREAR',
      version: 1,
      antes: null,
      despues: { nulos: 1 },
      fecha: serverTimestamp(),
    });
    await assertSucceeds(lote.commit());
  });

  it('se rechaza una auditoría suelta o falsificada', async () => {
    await assertFails(
      setDoc(doc(collection(veedorB(), 'auditoria')), {
        actaId: 'r1_2_ALCALDE',
        recintoId: 'r1',
        usuario: 'vB',
        accion: 'CREAR',
        version: 1,
        antes: null,
        despues: {},
        fecha: serverTimestamp(),
      }),
    );
  });
});

describe('Coordinador de recinto (R5)', () => {
  it('corrige un acta de su recinto', async () => {
    await assertSucceeds(
      updateDoc(doc(coordR1(), 'actas/r1_2_ALCALDE'), {
        nulos: 2,
        blancos: 0,
        estado: 'CORREGIDA',
        version: 2,
        updatedBy: 'cR1',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('NO corrige actas de otro recinto', async () => {
    await assertFails(
      updateDoc(doc(coordR2(), 'actas/r1_2_ALCALDE'), {
        nulos: 2,
        blancos: 0,
        estado: 'CORREGIDA',
        version: 2,
        updatedBy: 'cR2',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('reasigna un veedor de su recinto', async () => {
    await assertSucceeds(updateDoc(doc(coordR1(), 'jrv/r1_1'), { veedorId: 'vB' }));
  });

  it('NO asigna un veedor de otro recinto', async () => {
    await assertFails(updateDoc(doc(coordR1(), 'jrv/r1_1'), { veedorId: 'vC' }));
  });

  it('NO cambia otros campos de la mesa', async () => {
    await assertFails(updateDoc(doc(coordR1(), 'jrv/r1_1'), { numero: 9 }));
  });

  it('el veedor NO puede reasignarse mesas', async () => {
    await assertFails(updateDoc(doc(veedorA(), 'jrv/r1_2'), { veedorId: 'vA' }));
  });
});

describe('Alta de cuentas por jerarquía (R2)', () => {
  it('el coordinador crea un veedor de su recinto', async () => {
    await assertSucceeds(alta(coordR1(), 'nuevo1', perfilNuevo('VEEDOR', 'r1', 'cR1')));
  });

  it('el coordinador NO crea veedores de otro recinto ni coordinadores', async () => {
    await assertFails(alta(coordR1(), 'nuevo1', perfilNuevo('VEEDOR', 'r2', 'cR1')));
    await assertFails(alta(coordR1(), 'nuevo1', perfilNuevo('RECINTO', 'r1', 'cR1')));
  });

  it('un veedor NO crea cuentas', async () => {
    await assertFails(alta(veedorA(), 'nuevo1', perfilNuevo('VEEDOR', 'r1', 'vA')));
  });

  it('el provincial crea el coordinador de un recinto libre y lo asigna', async () => {
    await assertSucceeds(alta(provincial(), 'nuevo2', perfilNuevo('RECINTO', 'r3', 'p1'), 'r3'));
  });

  it('NO se asigna un segundo coordinador a un recinto', async () => {
    await assertFails(alta(provincial(), 'nuevo2', perfilNuevo('RECINTO', 'r1', 'p1'), 'r1'));
  });

  it('NO se crea un perfil sin su índice de cédula', async () => {
    await assertFails(setDoc(doc(coordR1(), 'usuarios/nuevo1'), perfilNuevo('VEEDOR', 'r1', 'cR1')));
  });

  it('NO se repite una cédula ya registrada', async () => {
    await assertFails(alta(coordR1(), 'nuevo1', perfilNuevo('VEEDOR', 'r1', 'cR1', { cedula: '1700000027' })));
  });

  it('nadie se crea su propio perfil', async () => {
    await assertFails(alta(sinPerfil(), 'intruso', perfilNuevo('PROVINCIAL', 'r1', 'intruso')));
  });

  it('el usuario solo marca que cambió su contraseña; no cambia su rol', async () => {
    await assertSucceeds(
      updateDoc(doc(veedorA(), 'usuarios/vA'), { debeCambiarPassword: false, passwordCambiadaEn: serverTimestamp() }),
    );
    await assertFails(updateDoc(doc(veedorA(), 'usuarios/vA'), { rol: 'PROVINCIAL' }));
  });
});

describe('Cuentas sin perfil, anónimos e índice de cédulas', () => {
  it('una cuenta de Auth sin perfil no lee nada', async () => {
    const db = sinPerfil();
    await assertFails(getDoc(doc(db, 'jrv/r1_1')));
    await assertFails(getDoc(doc(db, 'organizaciones/o1')));
    await assertFails(getDocs(query(collection(db, 'jrv'), where('veedorId', '==', 'intruso'))));
  });

  it('un anónimo no lee mesas ni catálogos', async () => {
    const db = anonimo();
    await assertFails(getDoc(doc(db, 'jrv/r1_1')));
    await assertFails(getDoc(doc(db, 'organizaciones/o1')));
  });

  it('el índice de cédulas se consulta por ID sin sesión, pero no se lista ni se escribe', async () => {
    const db = anonimo();
    await assertSucceeds(getDoc(doc(db, 'cedulas/1700000027')));
    await assertFails(getDocs(collection(db, 'cedulas')));
    await assertFails(setDoc(doc(db, 'cedulas/0912345675'), { uid: 'x', email: 'x@example.com' }));
  });
});

describe('Provincial: recintos (R4)', () => {
  function loteRecinto(db: Firestore, id: string, numJrv: number) {
    const lote = writeBatch(db);
    lote.set(doc(db, `recintos/${id}`), {
      provincia: 'Pichincha',
      canton: 'Quito',
      parroquia: 'Iñaquito',
      nombre: 'Nuevo',
      numJrv,
      lat: null,
      lng: null,
      coordinadorId: null,
    });
    for (let n = 1; n <= numJrv; n++) lote.set(doc(db, `jrv/${id}_${n}`), { recintoId: id, numero: n, veedorId: null });
    return lote.commit();
  }

  it('crea un recinto con sus JRV en un solo lote', async () => {
    await assertSucceeds(loteRecinto(provincial(), 'r9', 3));
  });

  it('un coordinador de recinto NO crea recintos', async () => {
    await assertFails(loteRecinto(coordR1(), 'r9', 2));
  });

  it('no se crean JRV sueltas de un recinto inexistente', async () => {
    await assertFails(setDoc(doc(provincial(), 'jrv/rx_1'), { recintoId: 'rx', numero: 1, veedorId: null }));
  });
});
