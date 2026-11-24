import { Component, inject } from '@angular/core';
import { IonText } from '@ionic/angular';

import { ColaFotosService } from '../../data/cola-fotos.service';
import { RedService } from '../../data/red.service';

/** Aviso de conexión y de fotos pendientes de sincronizar (R9, R10). */
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
    } @else if (cola.pendientes() > 0) {
      <div class="estado-red sincronizando" role="status">
        <ion-text color="medium">Sincronizando {{ cola.pendientes() }} foto(s)…</ion-text>
      </div>
    }
  `,
  imports: [IonText],
})
export class EstadoRedComponent {
  readonly red = inject(RedService);
  readonly cola = inject(ColaFotosService);
}
