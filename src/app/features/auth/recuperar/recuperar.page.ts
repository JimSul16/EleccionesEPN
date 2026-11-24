import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonInput, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/angular';

import { AuthService } from '../../../core/auth.service';
import { mensajeDeError } from '../../../core/errores';
import { cedulaValidator } from '../../../domain/form-validators';

@Component({
  selector: 'app-recuperar',
  templateUrl: 'recuperar.page.html',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonButton,
    IonSpinner,
    IonText,
  ],
})
export class RecuperarPage {
  private readonly auth = inject(AuthService);

  readonly form = inject(FormBuilder).nonNullable.group({ cedula: ['', [Validators.required, cedulaValidator]] });
  readonly cargando = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.mensaje.set(await this.auth.recuperarPassword(this.form.getRawValue().cedula));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
