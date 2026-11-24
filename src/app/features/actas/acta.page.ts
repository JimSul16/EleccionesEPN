import { Location } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { aEntero, validarActa } from '../../domain/acta.rules';
import { ORGANIZACION_IDS, type ConteoActa, type Dignidad, type Votos } from '../../domain/models';

import { RegistroActaStore } from './registro-acta.store';

/**
 * Registro y corrección de un acta (R6, R7). La usan el veedor (sus mesas) y el
 * coordinador de recinto (correcciones, R5). La lógica está en RegistroActaStore.
 */
@Component({
  selector: 'app-acta',
  templateUrl: 'acta.page.html',
  styleUrl: 'acta.page.scss',
  providers: [RegistroActaStore],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonInput,
    IonNote,
    IonButton,
    IonSpinner,
    IonText,
  ],
})
export class ActaPage implements OnInit, OnDestroy {
  readonly store = inject(RegistroActaStore);
  private readonly location = inject(Location);

  /** Parámetros de ruta (withComponentInputBinding). */
  readonly jrvId = input.required<string>();
  readonly dignidad = input.required<Dignidad>();

  readonly organizacionIds = ORGANIZACION_IDS;

  readonly form = inject(FormBuilder).group({
    o1: [null as number | null],
    o2: [null as number | null],
    o3: [null as number | null],
    o4: [null as number | null],
    o5: [null as number | null],
    nulos: [null as number | null],
    blancos: [null as number | null],
    totalSufragantes: [null as number | null],
  });

  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Conteo con números reales (los inputs entregan strings). */
  readonly conteo = computed<ConteoActa>(() => {
    const v = this.valores();
    const votos = Object.fromEntries(ORGANIZACION_IDS.map((o) => [o, aEntero(v[o])])) as unknown as Votos;
    return {
      votos,
      nulos: aEntero(v.nulos) as number,
      blancos: aEntero(v.blancos) as number,
      totalSufragantes: aEntero(v.totalSufragantes) as number,
    };
  });

  /** Validación en vivo con la misma regla que comprueba el servidor. */
  readonly validacion = computed(() => validarActa(this.conteo()));
  readonly errorPorCampo = computed(() => new Map(this.validacion().errores.map((e) => [e.campo, e.mensaje])));
  readonly puedeGuardar = computed(
    () => this.validacion().valida && this.store.faltantes().length === 0 && this.store.guardado() !== 'guardando',
  );

  constructor() {
    // Rellenar el formulario cuando llega el acta existente (corrección).
    effect(() => {
      if (this.store.carga() === 'listo') this.form.reset(this.store.valoresIniciales());
    });
    // Mientras guarda o tras guardar, el formulario queda bloqueado.
    effect(() => {
      const bloqueado = ['guardando', 'guardado', 'pendiente'].includes(this.store.guardado());
      if (bloqueado) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    void this.store.cargar(this.jrvId(), this.dignidad());
  }

  ngOnDestroy(): void {
    this.store.descartarFoto();
  }

  mostrarError(campo: string): string | null {
    const control = this.form.get(campo);
    return control?.dirty ? (this.errorPorCampo().get(campo as never) ?? null) : null;
  }

  guardar(): void {
    this.form.markAllAsDirty();
    if (this.puedeGuardar()) void this.store.guardar(this.conteo());
  }

  volver(): void {
    this.location.back();
  }
}
