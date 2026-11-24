/**
 * Pruebas de las reglas de seguridad (R8) contra los emuladores.
 * Demuestran que un veedor no puede leer ni escribir mesas o actas ajenas.
 *
 * Ejecutar:  npm run test:rules
 * (arranca los emuladores de Firestore y Storage, corre esto y los apaga)
 */
import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const veedorA = () => env.authenticatedContext('vA', { rol: 'VEEDOR', recintoId: 'r1' });
const veedorB = () => env.authenticatedContext('vB', { rol: 'VEEDOR', recintoId: 'r1' });
const coordR1 = () => env.authenticatedContext('cR1', { rol: 'RECINTO', recintoId: 'r1' });
const coordR2 = () => env.authenticatedContext('cR2', { rol: 'RECINTO', recintoId: 'r2' });
const provincial = () => env.authenticatedContext('p1', { rol: 'PROVINCIAL' });

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

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-elecciones-epn',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'recintos/r1'), { nombre: 'Recinto 1', numJrv: 2 });
    await setDoc(doc(db, 'recintos/r2'), { nombre: 'Recinto 2', numJrv: 1 });
    await setDoc(doc(db, 'jrv/r1_1'), { recintoId: 'r1', numero: 1, veedorId: 'vA' });
    await setDoc(doc(db, 'jrv/r1_2'), { recintoId: 'r1', numero: 2, veedorId: 'vB' });
    await setDoc(doc(db, 'jrv/r2_1'), { recintoId: 'r2', numero: 1, veedorId: 'vC' });
    await setDoc(doc(db, 'usuarios/vA'), { rol: 'VEEDOR', recintoId: 'r1' });
    await setDoc(doc(db, 'usuarios/vB'), { rol: 'VEEDOR', recintoId: 'r1' });
    await setDoc(doc(db, 'usuarios/vC'), { rol: 'VEEDOR', recintoId: 'r2' });
    await setDoc(doc(db, 'actas/r1_2_ALCALDE'), acta('r1_2', 'vB'));
  });
});

describe('Veedor: aislamiento de mesas (R8)', () => {
  it('lee su propia mesa', async () => {
    await assertSucceeds(getDoc(doc(veedorA().firestore(), 'jrv/r1_1')));
  });

  it('NO lee la mesa de otro veedor', async () => {
    await assertFails(getDoc(doc(veedorA().firestore(), 'jrv/r1_2')));
  });

  it('lista solo con el filtro de su uid', async () => {
    const db = veedorA().firestore();
    await assertSucceeds(getDocs(query(collection(db, 'jrv'), where('veedorId', '==', 'vA'))));
    await assertFails(getDocs(collection(db, 'jrv')));
  });

  it('NO lee el acta de una mesa ajena', async () => {
    await assertFails(getDoc(doc(veedorA().firestore(), 'actas/r1_2_ALCALDE')));
  });

  it('el dueño sí lee su acta', async () => {
    await assertSucceeds(getDoc(doc(veedorB().firestore(), 'actas/r1_2_ALCALDE')));
  });

  it('registra el acta de su mesa', async () => {
    await assertSucceeds(setDoc(doc(veedorA().firestore(), 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA')));
  });

  it('NO registra un acta en una mesa ajena', async () => {
    await assertFails(
      setDoc(doc(veedorA().firestore(), 'actas/r1_2_PREFECTO'), {
        ...acta('r1_2', 'vA'),
        dignidad: 'PREFECTO',
      }),
    );
  });
});

describe('Actas: validaciones en el servidor (R6)', () => {
  it('rechaza un acta cuyos totales no cuadran', async () => {
    await assertFails(
      setDoc(doc(veedorA().firestore(), 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { totalSufragantes: 30 })),
    );
  });

  it('rechaza votos negativos o decimales', async () => {
    const db = veedorA().firestore();
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { nulos: -1, totalSufragantes: 20 })));
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { nulos: 1.5, blancos: 0.5 })));
  });

  it('rechaza un id que no coincide con mesa y dignidad', async () => {
    await assertFails(setDoc(doc(veedorA().firestore(), 'actas/otro_id'), acta('r1_1', 'vA')));
  });

  it('rechaza falsificar registradoPor o recintoId', async () => {
    const db = veedorA().firestore();
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { registradoPor: 'vB' })));
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'vA', { recintoId: 'r2' })));
  });

  it('corrección: exige version + 1 (detecta conflictos)', async () => {
    const db = veedorB().firestore();
    const ref1 = doc(db, 'actas/r1_2_ALCALDE');
    const cambios = { nulos: 2, blancos: 0, estado: 'CORREGIDA', updatedBy: 'vB', updatedAt: serverTimestamp() };
    await assertFails(updateDoc(ref1, { ...cambios, version: 1 }));
    await assertFails(updateDoc(ref1, { ...cambios, version: 3 }));
    await assertSucceeds(updateDoc(ref1, { ...cambios, version: 2 }));
  });

  it('el provincial solo lee actas', async () => {
    const db = provincial().firestore();
    await assertSucceeds(getDoc(doc(db, 'actas/r1_2_ALCALDE')));
    await assertFails(setDoc(doc(db, 'actas/r1_1_ALCALDE'), acta('r1_1', 'p1')));
  });
});

describe('Coordinador de recinto (R5)', () => {
  it('corrige un acta de su recinto', async () => {
    await assertSucceeds(
      updateDoc(doc(coordR1().firestore(), 'actas/r1_2_ALCALDE'), {
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
      updateDoc(doc(coordR2().firestore(), 'actas/r1_2_ALCALDE'), {
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
    await assertSucceeds(updateDoc(doc(coordR1().firestore(), 'jrv/r1_1'), { veedorId: 'vB' }));
  });

  it('NO asigna un veedor de otro recinto', async () => {
    await assertFails(updateDoc(doc(coordR1().firestore(), 'jrv/r1_1'), { veedorId: 'vC' }));
  });

  it('NO cambia otros campos de la mesa', async () => {
    await assertFails(updateDoc(doc(coordR1().firestore(), 'jrv/r1_1'), { numero: 9 }));
  });

  it('el veedor NO puede reasignarse mesas', async () => {
    await assertFails(updateDoc(doc(veedorA().firestore(), 'jrv/r1_2'), { veedorId: 'vA' }));
  });
});

describe('Usuarios y anónimos', () => {
  it('un anónimo no lee nada', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'jrv/r1_1')));
    await assertFails(getDoc(doc(db, 'organizaciones/o1')));
  });

  it('nadie escribe usuarios desde el cliente (ni cambia su rol)', async () => {
    await assertFails(setDoc(doc(veedorA().firestore(), 'usuarios/vA'), { rol: 'PROVINCIAL', recintoId: 'r1' }));
  });
});

describe('Storage: fotos de actas (R7, R8)', () => {
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

  it('el veedor sube la foto de su mesa', async () => {
    const storage = veedorA().storage();
    await assertSucceeds(
      uploadBytes(ref(storage, 'actas/r1/r1_1/ALCALDE-abc123.jpg'), jpg, { contentType: 'image/jpeg' }),
    );
  });

  it('NO sube fotos a una mesa ajena', async () => {
    const storage = veedorA().storage();
    await assertFails(
      uploadBytes(ref(storage, 'actas/r1/r1_2/ALCALDE-abc123.jpg'), jpg, { contentType: 'image/jpeg' }),
    );
  });

  it('NO sube archivos que no son JPEG', async () => {
    const storage = veedorA().storage();
    await assertFails(uploadBytes(ref(storage, 'actas/r1/r1_1/ALCALDE-abc123.jpg'), jpg, { contentType: 'image/png' }));
  });
});
