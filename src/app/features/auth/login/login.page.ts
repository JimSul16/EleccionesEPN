import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AuthService } from '../../../core/auth.service';
import { mensajeDeError } from '../../../core/errores';
import { MENSAJES_CEDULA, type ErrorCedula } from '../../../domain/cedula.validator';
import { cedulaValidator } from '../../../domain/form-validators';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonButton,
    IonNote,
    IonSpinner,
    IonText,
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = inject(FormBuilder).nonNullable.group({
    cedula: ['', [Validators.required, cedulaValidator]],
    password: ['', Validators.required],
  });

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  errorCedula(): string | null {
    const c = this.form.controls.cedula;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return MENSAJES_CEDULA.requerida;
    return MENSAJES_CEDULA[c.getError('cedula') as ErrorCedula] ?? null;
  }

  async ingresar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    try {
      const { cedula, password } = this.form.getRawValue();
      const usuario = await this.auth.login(cedula, password);
      await this.router.navigateByUrl(
        usuario.debeCambiarPassword ? '/cambiar-password' : this.auth.inicioPorRol(usuario.rol),
        {
          replaceUrl: true,
        },
      );
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
