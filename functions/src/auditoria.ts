/**
 * Auditoría de actas (R5, R6): cada alta o corrección queda registrada con el
 * antes y el después. El cliente no puede escribir en /auditoria (ver firestore.rules).
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

export const auditarActa = onDocumentWritten('actas/{actaId}', async (event) => {
  const antes = event.data?.before.exists ? event.data.before.data() : null;
  const despues = event.data?.after.exists ? event.data.after.data() : null;
  const fuente = despues ?? antes;
  if (!fuente) return;

  await getFirestore().collection('auditoria').add({
    actaId: event.params.actaId,
    recintoId: fuente['recintoId'] ?? null,
    usuario: despues?.['updatedBy'] ?? null,
    accion: !antes ? 'CREAR' : !despues ? 'ELIMINAR' : 'CORREGIR',
    antes,
    despues,
    fecha: FieldValue.serverTimestamp(),
  });
});
