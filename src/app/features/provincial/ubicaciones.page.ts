import { Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { enlaceMapa } from '../../domain/geo';

import { ProvincialStore } from './provincial.store';

/** Coordenadas GPS de cada acta (R4), con las registradas lejos de su recinto primero. */
@Component({
  selector: 'app-ubicaciones',
  templateUrl: 'ubicaciones.page.html',
  styleUrl: 'ubicaciones.page.scss',
  providers: [ProvincialStore],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonSpinner,
    IonText,
  ],
})
export class UbicacionesPage {
  readonly store = inject(ProvincialStore);
  readonly enlaceMapa = enlaceMapa;
}
