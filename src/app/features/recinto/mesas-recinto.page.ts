import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AuthService } from '../../core/auth.service';
import { DIGNIDADES, type Dignidad, type EstadoMesa } from '../../domain/models';
import { EstadoRedComponent } from '../shared/estado-red.component';

import { MesasRecintoStore, type FilaMesa } from './mesas-recinto.store';

const SIN_VEEDOR = '__ninguno__';

@Component({
  selector: 'app-mesas-recinto',
  templateUrl: 'mesas-recinto.page.html',
  providers: [MesasRecintoStore],
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
    IonBadge,
    IonSelect,
    IonSelectOption,
    IonProgressBar,
    IonSpinner,
    IonText,
  ],
})
export class MesasRecintoPage {
  readonly store = inject(MesasRecintoStore);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);

  readonly dignidades = DIGNIDADES;
  readonly sinVeedor = SIN_VEEDOR;

  readonly etiquetaEstado: Record<EstadoMesa, { texto: string; color: string }> = {
    SIN_VEEDOR: { texto: 'Sin veedor', color: 'danger' },
    PENDIENTE: { texto: 'Pendiente', color: 'medium' },
    PARCIAL: { texto: '1/2 actas', color: 'warning' },
    COMPLETA: { texto: 'Completa', color: 'success' },
  };

  nombreDignidad(d: Dignidad): string {
    return d === 'ALCALDE' ? 'Alcaldía' : 'Prefectura';
  }

  /** Reasignar una mesa que ya tiene veedor pide confirmación (R5). */
  async cambiarVeedor(fila: FilaMesa, valor: string): Promise<void> {
    const nuevo = valor === SIN_VEEDOR ? null : valor;
    if (nuevo === fila.jrv.veedorId) return;
    if (fila.jrv.veedorId) {
      const alerta = await this.alertas.create({
        header: `Reasignar mesa ${fila.jrv.numero}`,
        message: nuevo
          ? 'El veedor actual dejará de ver esta mesa. Las actas ya registradas se conservan.'
          : 'La mesa quedará sin veedor.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Reasignar', role: 'confirm' },
        ],
      });
      await alerta.present();
      const { role } = await alerta.onDidDismiss();
      if (role !== 'confirm') return;
    }
    await this.store.asignar(fila.jrv.id, nuevo);
  }

  async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
