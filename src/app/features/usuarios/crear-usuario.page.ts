import { Location } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
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
import { UsuarioRepository, type NuevoUsuario } from '../../data/usuario.repository';
import { MENSAJES_CEDULA, type ErrorCedula } from '../../domain/cedula.validator';
import { cedulaValidator, emailValidator, telefonoValidator } from '../../domain/form-validators';
import { PASSWORD_INICIAL } from '../../domain/usuario.rules';

/**
 * Alta de cuentas (R2). La usan el coordinador de recinto (crea veedores) y el
 * provincial (crea el coordinador de un recinto). La jerarquía la vuelve a
 * comprobar la Function crearUsuario en el servidor.
 */
@Component({
  selector: 'app-crear-usuario',
  templateUrl: 'crear-usuario.page.html',
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
export class CrearUsuarioPage {
  private readonly usuarios = inject(UsuarioRepository);
  private readonly location = inject(Location);

  /** Desde data de la ruta. */
  readonly rol = input.required<NuevoUsuario['rol']>();
  /** Desde el parámetro de ruta, solo al crear un coordinador. */
  readonly recintoId = input<string>();

  readonly titulo = computed(() => (this.rol() === 'VEEDOR' ? 'Nuevo veedor' : 'Nuevo coordinador de recinto'));
  readonly passwordInicial = PASSWORD_INICIAL;

  readonly form = inject(FormBuilder).nonNullable.group({
    cedula: ['', [Validators.required, cedulaValidator]],
    nombres: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(80)]],
    telefono: ['', [Validators.required, telefonoValidator]],
    email: ['', [Validators.required, emailValidator]],
  });

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly creado = signal<{ nombre: string; correoEnviado: boolean } | null>(null);

  mensaje(campo: keyof typeof this.form.controls): string {
    const c = this.form.controls[campo];
    if (!c.touched || c.valid) return '';
    if (c.hasError('required')) return 'Campo obligatorio.';
    if (c.hasError('cedula')) return MENSAJES_CEDULA[c.getError('cedula') as ErrorCedula];
    if (c.hasError('telefono')) return 'Celular de 10 dígitos que empiece con 09.';
    if (c.hasError('email')) return 'Correo no válido.';
    return 'Valor no válido.';
  }

  async crear(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const datos = this.form.getRawValue();
      const r = await this.usuarios.crear({ ...datos, rol: this.rol(), recintoId: this.recintoId() });
      this.creado.set({ nombre: `${datos.nombres} ${datos.apellidos}`, correoEnviado: r.correoEnviado });
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  otro(): void {
    this.creado.set(null);
    this.form.reset();
  }

  volver(): void {
    this.location.back();
  }
}
