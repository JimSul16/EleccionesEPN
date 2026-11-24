import { Component, effect, inject, signal, untracked, viewChild } from '@angular/core';
import type { OnDestroy , ElementRef} from '@angular/core';
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
import { ActaRepository, type TotalesVotos } from '../../data/acta.repository';
import { CatalogoRepository } from '../../data/catalogo.repository';
import { ORGANIZACION_IDS, type Candidato, type Dignidad, type Organizacion } from '../../domain/models';

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
 * Los totales se calculan en el servidor con consultas de agregación y se
 * recalculan cuando cambian las actas. Un solo color neutro para todas las
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
  private readonly actas = inject(ActaRepository);
  private readonly catalogo = inject(CatalogoRepository);

  readonly dignidad = signal<Dignidad>('ALCALDE');
  /** '' = consolidado provincial. */
  readonly recintoId = signal<string>('');
  readonly estado = signal<Estado>({ estado: 'cargando' });
  readonly filas = signal<FilaResultado[]>([]);

  private readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('grafico');
  private grafico?: Chart;
  private organizaciones: Organizacion[] = [];
  private candidatos: Candidato[] = [];
  private consulta = 0;

  constructor() {
    // Recalcular al cambiar filtros o cuando llegan actas nuevas o corregidas.
    // cargar() se ejecuta con untracked: lee y escribe `estado`, y si el effect lo
    // registrara como dependencia se volvería a disparar sin fin.
    effect(() => {
      const dignidad = this.dignidad();
      const recinto = this.recintoId();
      this.store.totalActas();
      untracked(() => void this.cargar(dignidad, recinto));
    });
    effect(() => this.dibujar(this.filas(), this.lienzo()?.nativeElement));
  }

  ngOnDestroy(): void {
    this.grafico?.destroy();
  }

  private async cargar(dignidad: Dignidad, recintoId: string): Promise<void> {
    const id = ++this.consulta;
    if (this.estado().estado !== 'listo') this.estado.set({ estado: 'cargando' });
    try {
      if (this.organizaciones.length === 0) {
        [this.organizaciones, this.candidatos] = await Promise.all([
          this.catalogo.organizaciones(),
          this.catalogo.candidatos(),
        ]);
      }
      const totales = await this.actas.totales(dignidad, recintoId || undefined);
      if (id !== this.consulta) return; // Llegó una respuesta vieja: se descarta.
      const validos = ORGANIZACION_IDS.reduce((s, o) => s + totales.votos[o], 0);
      this.filas.set(
        this.organizaciones.map((o) => {
          const c = this.candidatos.find((x) => x.organizacionId === o.id && x.dignidad === dignidad);
          const votos = totales.votos[o.id];
          return {
            etiqueta: `${o.siglas} · ${c?.nombre ?? 'Sin candidatura'}`,
            votos,
            porcentaje: validos ? Math.round((votos / validos) * 1000) / 10 : 0,
          };
        }),
      );
      this.estado.set({ estado: 'listo', totales });
    } catch (e) {
      if (id === this.consulta) this.estado.set({ estado: 'error', mensaje: mensajeDeError(e) });
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
