import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonProgressBar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AuthService } from '../../core/auth.service';
import { EstadoRedComponent } from '../shared/estado-red.component';

import { ProvincialStore } from './provincial.store';

/** Inicio del provincial: recintos, su coordinador y el avance de actas (R4). */
@Component({
  selector: 'app-recintos',
  templateUrl: 'recintos.page.html',
  styleUrl: 'recintos.page.scss',
  providers: [ProvincialStore],
  imports: [
    RouterLink,
    EstadoRedComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonProgressBar,
    IonBadge,
    IonSpinner,
    IonText,
  ],
})
export class RecintosPage {
  readonly store = inject(ProvincialStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
