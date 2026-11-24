import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { mensajeDeError } from '../../core/errores';
import { RecintoRepository } from '../../data/recinto.repository';
import { MENSAJES_UBICACION, UbicacionError, UbicacionService } from '../../data/ubicacion.service';

/** Alta de un recinto con sus JRV (R4). */
@Component({
  selector: 'app-nuevo-recinto',
  templateUrl: 'nuevo-recinto.page.html',
  styleUrl: 'nuevo-recinto.page.scss',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonInput,
    IonButton,
    IonSpinner,
    IonText,
  ],
})
export class NuevoRecintoPage {
  private readonly recintos = inject(RecintoRepository);
  private readonly ubicacion = inject(UbicacionService);
  private readonly location = inject(Location);

  readonly form = inject(FormBuilder).group({
    provincia: ['Pichincha', [Validators.required, Validators.maxLength(60)]],
    canton: ['Quito', [Validators.required, Validators.maxLength(60)]],
    parroquia: ['', [Validators.required, Validators.maxLength(60)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    numJrv: [
      null as number | null,
      [Validators.required, Validators.min(1), Validators.max(200), Validators.pattern(/^\d+$/)],
    ],
    lat: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    lng: [null as number | null, [Validators.min(-180), Validators.max(180)]],
  });

  readonly guardando = signal(false);
  readonly ubicando = signal(false);
  readonly error = signal<string | null>(null);

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  /** Toma las coordenadas del recinto desde el GPS del teléfono, estando en el lugar. */
  async usarMiUbicacion(): Promise<void> {
    this.ubicando.set(true);
    this.error.set(null);
    try {
      const u = await this.ubicacion.obtener();
      this.form.patchValue({ lat: Number(u.lat.toFixed(6)), lng: Number(u.lng.toFixed(6)) });
    } catch (e) {
      this.error.set(MENSAJES_UBICACION[e instanceof UbicacionError ? e.tipo : 'fallo']);
    } finally {
      this.ubicando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const v = this.form.getRawValue();
      await this.recintos.crear({
        provincia: v.provincia!,
        canton: v.canton!,
        parroquia: v.parroquia!,
        nombre: v.nombre!,
        numJrv: Number(v.numJrv),
        lat: v.lat === null || v.lat === undefined || String(v.lat) === '' ? undefined : Number(v.lat),
        lng: v.lng === null || v.lng === undefined || String(v.lng) === '' ? undefined : Number(v.lng),
      });
      this.location.back();
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.guardando.set(false);
    }
  }
}
