import { Component, inject } from '@angular/core';
import { IonText } from '@ionic/angular';

import { RedService } from '../../data/red.service';

/** Aviso de conexión y de sincronización de lo guardado sin red (R9, R10). */
@Component({
  selector: 'app-estado-red',
  template: `
    @if (!red.conectado()) {
      <div class="estado-red sin-red" role="status">
        <img
          class="estado-red__icono"
          src="assets/svg/sin-conexion.svg"
          alt=""
          aria-hidden="true"
          width="24"
          height="24"
        />
        <ion-text color="warning">Sin conexión. Lo que registre se guardará y se enviará al reconectar.</ion-text>
      </div>
    } @else if (red.sincronizando()) {
      <div class="estado-red sincronizando" role="status">
        <ion-text color="medium">Sincronizando actas y fotos guardadas sin conexión…</ion-text>
      </div>
    }
  `,
  imports: [IonText],
})
export class EstadoRedComponent {
  readonly red = inject(RedService);
}
