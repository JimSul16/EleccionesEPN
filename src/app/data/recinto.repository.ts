import { inject, Injectable } from '@angular/core';
import { collection, doc, getDoc, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore';
import { Observable } from 'rxjs';

import { FirebaseService } from '../core/firebase';
import { jrvId, type Recinto } from '../domain/models';

export type NuevoRecinto = Omit<Recinto, 'id' | 'coordinadorId'>;

@Injectable({ providedIn: 'root' })
export class RecintoRepository {
  private readonly fb = inject(FirebaseService);

  /** Todos los recintos en tiempo real (solo el provincial tiene permiso de listar). */
  todos$(): Observable<Recinto[]> {
    return new Observable((sub) =>
      onSnapshot(
        query(collection(this.fb.db, 'recintos'), orderBy('nombre')),
        (s) => sub.next(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Recinto, 'id'>) }))),
        (e) => sub.error(e),
      ),
    );
  }

  async obtener(id: string): Promise<Recinto | null> {
    const s = await getDoc(doc(this.fb.db, 'recintos', id));
    return s.exists() ? { id: s.id, ...(s.data() as Omit<Recinto, 'id'>) } : null;
  }

  /**
   * Crea el recinto y sus JRV en una sola escritura atómica (R4).
   * Las reglas validan que la JRV pertenezca a un recinto existente al final del lote.
   */
  async crear(datos: NuevoRecinto): Promise<string> {
    const ref = doc(collection(this.fb.db, 'recintos'));
    const lote = writeBatch(this.fb.db);
    lote.set(ref, {
      provincia: datos.provincia.trim(),
      canton: datos.canton.trim(),
      parroquia: datos.parroquia.trim(),
      nombre: datos.nombre.trim(),
      numJrv: datos.numJrv,
      lat: datos.lat ?? null,
      lng: datos.lng ?? null,
      coordinadorId: null,
    });
    for (let n = 1; n <= datos.numJrv; n++) {
      lote.set(doc(this.fb.db, 'jrv', jrvId(ref.id, n)), { recintoId: ref.id, numero: n, veedorId: null });
    }
    await lote.commit();
    return ref.id;
  }
}
