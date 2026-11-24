import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonInput, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/angular';

import { AuthService } from '../../../core/auth.service';
import { mensajeDeError } from '../../../core/errores';
import { MENSAJES_PASSWORD, validarPasswordNueva } from '../../../domain/usuario.rules';

@Component({
  selector: 'app-cambiar-password',
  templateUrl: 'cambiar-password.page.html',
  imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonButton, IonSpinner, IonText],
})
export class CambiarPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = inject(FormBuilder).nonNullable.group({ nueva: [''], confirmacion: [''] });
  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Requisitos pendientes, mostrados en vivo mientras escribe. */
  readonly pendientes = computed(() => {
    const { nueva = '', confirmacion = '' } = this.valores();
    return validarPasswordNueva(nueva, confirmacion).map((e) => MENSAJES_PASSWORD[e]);
  });

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  async guardar(): Promise<void> {
    if (this.pendientes().length > 0) return;
    this.cargando.set(true);
    this.error.set(null);
    try {
      await this.auth.cambiarPassword(this.form.getRawValue().nueva);
      await this.router.navigateByUrl(this.auth.inicioPorRol(), { replaceUrl: true });
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
