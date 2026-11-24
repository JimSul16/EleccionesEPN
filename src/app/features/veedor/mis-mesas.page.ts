import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AuthService } from '../../core/auth.service';
import { DIGNIDADES, type Acta, type Dignidad } from '../../domain/models';
import { EstadoRedComponent } from '../shared/estado-red.component';

import { MisMesasStore } from './mis-mesas.store';

@Component({
  selector: 'app-mis-mesas',
  templateUrl: 'mis-mesas.page.html',
  styleUrl: 'mis-mesas.page.scss',
  providers: [MisMesasStore],
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
    IonCardContent,
    IonBadge,
    IonSpinner,
    IonText,
  ],
})
export class MisMesasPage {
  readonly store = inject(MisMesasStore);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly dignidades = DIGNIDADES;

  nombreDignidad(d: Dignidad): string {
    return d === 'ALCALDE' ? 'Alcaldía' : 'Prefectura';
  }

  estadoActa(acta: Acta | null): { texto: string; color: string } {
    if (!acta) return { texto: 'Pendiente', color: 'medium' };
    return acta.estado === 'CORREGIDA'
      ? { texto: 'Corregida', color: 'warning' }
      : { texto: 'Registrada', color: 'success' };
  }

  async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
