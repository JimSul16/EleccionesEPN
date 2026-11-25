import { computed, Component, effect, inject, signal, viewChild } from '@angular/core';
import type { OnDestroy, ElementRef } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';

import { mensajeDeError } from '../../core/errores';
import { CatalogoRepository } from '../../data/catalogo.repository';
import { ORGANIZACION_IDS, type Candidato, type Dignidad, type Organizacion } from '../../domain/models';
import { sumarActas, type TotalesVotos } from '../../domain/totales';

import { ProvincialStore } from './provincial.store';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export interface FilaResultado {
  etiqueta: string;
  votos: number;
  porcentaje: number;
}

type Estado =
  { estado: 'cargando' } | { estado: 'error'; mensaje: string } | { estado: 'listo'; totales: TotalesVotos };

/**
 * Dashboard de votos por candidato (R4): por dignidad, consolidado o por recinto.
 * Los totales se suman sobre las actas que el store recibe en tiempo real, así
 * se actualizan solos y no dependen de índices ni de consultas de agregación. Un solo color neutro para todas las
 * barras: el gráfico no asocia colores a partidos. La tabla repite los datos
 * para lectores de pantalla.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrl: 'dashboard.page.scss',
  // Altura fija del contenedor: Chart.js con maintainAspectRatio=false la necesita
  // para dimensionar el canvas (el estilo visual va en el .scss de OpenCode).
  styles: ['.grafico { position: relative; height: 18rem; }'],
  providers: [ProvincialStore],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
  ],
})
export class DashboardPage implements OnDestroy {
  readonly store = inject(ProvincialStore);
  private readonly catalogo = inject(CatalogoRepository);

  readonly dignidad = signal<Dignidad>('ALCALDE');
  /** '' = consolidado provincial. */
  readonly recintoId = signal<string>('');
  private readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('grafico');
  private grafico?: Chart;
  private readonly catalogoCargado = signal<{ organizaciones: Organizacion[]; candidatos: Candidato[] } | null>(
    null,
  );
  private readonly errorCatalogo = signal<string | null>(null);

  readonly estado = computed<Estado>(() => {
    const error = this.errorCatalogo();
    if (error) return { estado: 'error', mensaje: error };
    const actas = this.store.actasEnVivo();
    if (actas.estado === 'error') return { estado: 'error', mensaje: actas.mensaje };
    if (actas.estado === 'cargando' || !this.catalogoCargado()) return { estado: 'cargando' };
    return { estado: 'listo', totales: sumarActas(actas.datos, this.dignidad(), this.recintoId() || undefined) };
  });

  readonly filas = computed<FilaResultado[]>(() => {
    const e = this.estado();
    const cat = this.catalogoCargado();
    if (e.estado !== 'listo' || !cat) return [];
    const { totales } = e;
    const dignidad = this.dignidad();
    const validos = ORGANIZACION_IDS.reduce((s, o) => s + totales.votos[o], 0);
    return cat.organizaciones.map((o) => {
      const c = cat.candidatos.find((x) => x.organizacionId === o.id && x.dignidad === dignidad);
      const votos = totales.votos[o.id];
      return {
        etiqueta: `${o.siglas} · ${c?.nombre ?? 'Sin candidatura'}`,
        votos,
        porcentaje: validos ? Math.round((votos / validos) * 1000) / 10 : 0,
      };
    });
  });

  constructor() {
    void this.cargarCatalogo();
    effect(() => this.dibujar(this.filas(), this.lienzo()?.nativeElement));
  }

  ngOnDestroy(): void {
    this.grafico?.destroy();
  }

  private async cargarCatalogo(): Promise<void> {
    try {
      const [organizaciones, candidatos] = await Promise.all([
        this.catalogo.organizaciones(),
        this.catalogo.candidatos(),
      ]);
      this.catalogoCargado.set({ organizaciones, candidatos });
    } catch (e) {
      this.errorCatalogo.set(mensajeDeError(e));
    }
  }

  private dibujar(filas: FilaResultado[], canvas: HTMLCanvasElement | undefined): void {
    if (!canvas) return;
    const estilos = getComputedStyle(document.documentElement);
    const color = estilos.getPropertyValue('--ion-color-primary').trim() || 'gray';
    const texto = estilos.getPropertyValue('--ion-text-color').trim() || 'gray';
    const datos = {
      labels: filas.map((f) => f.etiqueta),
      datasets: [{ label: 'Votos', data: filas.map((f) => f.votos), backgroundColor: color, borderRadius: 2 }],
    };
    if (this.grafico) {
      this.grafico.data = datos;
      this.grafico.update();
      return;
    }
    this.grafico = new Chart(canvas, {
      type: 'bar',
      data: datos,
      options: {
        indexAxis: 'y',
        // Sin animación: los totales se ven al instante, se respeta "reducir
        // movimiento" y no depende de requestAnimationFrame (pausado en segundo plano).
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { enabled: true } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0, color: texto } },
          y: { ticks: { color: texto } },
        },
      },
    });
  }
}
