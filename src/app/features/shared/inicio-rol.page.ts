import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

import { AuthService } from '../../core/auth.service';

/**
 * Pantalla de inicio provisional de cada rol. Se reemplaza por las pantallas
 * reales de provincial, recinto y veedor en los siguientes pasos.
 */
@Component({
  selector: 'app-inicio-rol',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ titulo() }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="salir()">Salir</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>Bienvenido, {{ auth.usuario()?.nombres }}.</p>
    </ion-content>
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
})
export class InicioRolPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Llega desde data de la ruta (withComponentInputBinding). */
  readonly titulo = input('Inicio');

  async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
