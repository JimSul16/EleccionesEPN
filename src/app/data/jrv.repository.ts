import { inject, Injectable } from '@angular/core';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where, type Query } from 'firebase/firestore';
import { Observable } from 'rxjs';

import { FirebaseService } from '../core/firebase';
import type { Jrv } from '../domain/models';

/**
 * Mesas (JRV). Cada consulta lleva el mismo filtro que exige firestore.rules:
 * las reglas no son filtros, una consulta más amplia sería rechazada entera.
 */
@Injectable({ providedIn: 'root' })
export class JrvRepository {
  private readonly fb = inject(FirebaseService);

  /** Mesas asignadas al veedor (R6: "ver solo mesas asignadas"). */
  delVeedor$(uid: string): Observable<Jrv[]> {
    return this.escuchar(query(collection(this.fb.db, 'jrv'), where('veedorId', '==', uid)));
  }

  /** Mesas de un recinto (coordinador de recinto y provincial). */
  delRecinto$(recintoId: string): Observable<Jrv[]> {
    return this.escuchar(query(collection(this.fb.db, 'jrv'), where('recintoId', '==', recintoId)));
  }

  /** Una mesa por ID (las reglas comprueban que sea del veedor o de su recinto). */
  async obtener(id: string): Promise<Jrv | null> {
    const s = await getDoc(doc(this.fb.db, 'jrv', id));
    return s.exists() ? { id: s.id, ...(s.data() as Omit<Jrv, 'id'>) } : null;
  }

  /** Asigna, reasigna o libera (null) el veedor de una mesa (R5). */
  asignarVeedor(jrvId: string, veedorId: string | null): Promise<void> {
    return updateDoc(doc(this.fb.db, 'jrv', jrvId), { veedorId });
  }

  private escuchar(q: Query): Observable<Jrv[]> {
    return new Observable((sub) =>
      onSnapshot(
        q,
        (s) =>
          sub.next(
            s.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<Jrv, 'id'>) }))
              .sort((a, b) => a.recintoId.localeCompare(b.recintoId) || a.numero - b.numero),
          ),
        (e) => sub.error(e),
      ),
    );
  }
}
