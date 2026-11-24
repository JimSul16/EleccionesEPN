import { inject, Injectable } from '@angular/core';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

import { FirebaseService } from '../core/firebase';
import type { Candidato, Dignidad, Organizacion, OrganizacionId } from '../domain/models';

/** Organizaciones y candidaturas precargadas (R1). Solo lectura; se cachean en memoria. */
@Injectable({ providedIn: 'root' })
export class CatalogoRepository {
  private readonly fb = inject(FirebaseService);
  private organizacionesCache?: Promise<Organizacion[]>;
  private candidatosCache?: Promise<Candidato[]>;

  organizaciones(): Promise<Organizacion[]> {
    this.organizacionesCache ??= getDocs(query(collection(this.fb.db, 'organizaciones'), orderBy('lista'))).then((s) =>
      s.docs.map((d) => ({ id: d.id as OrganizacionId, ...(d.data() as Omit<Organizacion, 'id'>) })),
    );
    return this.organizacionesCache;
  }

  async candidatos(dignidad?: Dignidad): Promise<Candidato[]> {
    this.candidatosCache ??= getDocs(collection(this.fb.db, 'candidatos')).then((s) =>
      s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Candidato, 'id'>) })),
    );
    const todos = await this.candidatosCache;
    return dignidad ? todos.filter((c) => c.dignidad === dignidad) : todos;
  }
}
