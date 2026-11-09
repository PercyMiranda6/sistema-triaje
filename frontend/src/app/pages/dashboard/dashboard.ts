import { Component, inject, signal, ElementRef, viewChild, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import Chart from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';
import { DashboardService, DatosDashboard } from '../../services/dashboard.service';
import { EncuestaService } from '../../services/encuesta.service';
import {
  CsatMetrica,
  CsatPorCategoria,
  CsatPorAnalista,
  CsatPorMes,
  NpsResumen,
  NpsPorPeriodo,
} from '../../models';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnDestroy {
  private dash = inject(DashboardService);
  private encuesta = inject(EncuestaService);

  datos = signal<DatosDashboard | null>(null);
  csat = signal<{
    promedio: CsatMetrica;
    porCategoria: CsatPorCategoria[];
    porAnalista: CsatPorAnalista[];
    porMes: CsatPorMes[];
  } | null>(null);
  nps = signal<{
    resumen: NpsResumen;
    porPeriodo: NpsPorPeriodo[];
  } | null>(null);
  cargando = signal(true);
  error = signal('');

  canvasEstado = viewChild<ElementRef<HTMLCanvasElement>>('canvasEstado');
  canvasSeveridad = viewChild<ElementRef<HTMLCanvasElement>>('canvasSeveridad');
  canvasCategoria = viewChild<ElementRef<HTMLCanvasElement>>('canvasCategoria');
  canvasPorDia = viewChild<ElementRef<HTMLCanvasElement>>('canvasPorDia');
  canvasCsat = viewChild<ElementRef<HTMLCanvasElement>>('canvasCsat');
  canvasNps = viewChild<ElementRef<HTMLCanvasElement>>('canvasNps');

  private graficos: Chart[] = [];

  constructor() {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destruir();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    let d: DatosDashboard | null = null;
    try {
      const [dash, csat, nps] = await Promise.all([
        firstValueFrom(this.dash.resumen()),
        firstValueFrom(this.encuesta.metricasCsat()).catch(() => null),
        firstValueFrom(this.encuesta.metricasNps()).catch(() => null),
      ]);
      this.datos.set(dash);
      this.csat.set(csat);
      this.nps.set(nps);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudieron cargar las métricas.');
    } finally {
      this.cargando.set(false);
    }

    // Dibuja cuando los canvas ya están montados y con tamaño (un frame después del render).
    if (d) {
      setTimeout(() => this.dibujar(d!), 0);
    }
    setTimeout(() => this.dibujarCsat(), 0);
    setTimeout(() => this.dibujarNps(), 0);
  }

  private dibujar(d: DatosDashboard): void {
    this.destruir();

    const COLOR_ESTADO: Record<string, string> = {
      nuevo: '#9A9EA8',
      asignado: '#0B0D12',
      en_proceso: '#C67A08',
      resuelto: '#177A52',
      cerrado: '#757A87',
      rechazado: '#B3261E',
    };
    const COLOR_SEV: Record<string, string> = {
      Critica: '#B3261E',
      Alta: '#DC4326',
      Media: '#C67A08',
      Baja: '#177A52',
    };
    const COLOR_CAT = ['#0B0D12', '#DC4326', '#234F8F', '#C67A08', '#177A52'];

    const ESTADO_TEXTO: Record<string, string> = {
      nuevo: 'Nuevo',
      asignado: 'Asignado',
      en_proceso: 'En proceso',
      resuelto: 'Resuelto',
      cerrado: 'Cerrado',
      rechazado: 'Rechazado',
    };

    const opcionesCirculares = (cutout: string | null) => ({
      responsive: true,
      maintainAspectRatio: false,
      ...(cutout ? { cutout } : {}),
      plugins: {
        legend: {
          position: 'right' as const,
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            color: '#3D424E',
            font: { family: "'Inter', 'Segoe UI', sans-serif", size: 11 },
          },
        },
      },
    });

    const ejes = {
      grid: { color: 'rgba(20, 22, 28, 0.07)', drawTicks: false },
      ticks: {
        color: '#9A9EA8',
        font: { family: "'JetBrains Mono', Consolas, monospace", size: 10 },
        padding: 8,
      },
    };

    const crear = (el: HTMLCanvasElement | undefined, config: ChartConfiguration) => {
      if (!el) {
        console.warn('[Dashboard] Canvas no encontrado:', config.type);
        return;
      }
      this.graficos.push(new Chart(el, config));
    };

    crear(this.canvasEstado()?.nativeElement, {
      type: 'doughnut',
      data: {
        labels: d.estado.map((e) => ESTADO_TEXTO[e.estado] || e.estado),
        datasets: [{
          data: d.estado.map((e) => e.cantidad),
          backgroundColor: d.estado.map((e) => COLOR_ESTADO[e.estado] || '#9A9EA8'),
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }],
      },
      options: opcionesCirculares('62%'),
    });

    crear(this.canvasSeveridad()?.nativeElement, {
      type: 'bar',
      data: {
        labels: d.severidad.map((s) => s.severidad),
        datasets: [{
          label: 'Tickets',
          data: d.severidad.map((s) => s.cantidad),
          backgroundColor: d.severidad.map((s) => COLOR_SEV[s.severidad] || '#9A9EA8'),
          borderRadius: 6,
          maxBarThickness: 48,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: ejes.ticks }, y: { beginAtZero: true, grid: ejes.grid, ticks: ejes.ticks, border: { display: false } } },
      },
    });

    crear(this.canvasCategoria()?.nativeElement, {
      type: 'pie',
      data: {
        labels: d.categoria.map((c) => c.categoria),
        datasets: [{
          data: d.categoria.map((c) => c.cantidad),
          backgroundColor: COLOR_CAT,
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }],
      },
      options: opcionesCirculares(null),
    });

    crear(this.canvasPorDia()?.nativeElement, {
      type: 'line',
      data: {
        labels: d.por_dia.map((x) => x.fecha),
        datasets: [{
          label: 'Tickets creados',
          data: d.por_dia.map((x) => x.cantidad),
          borderColor: '#DC4326',
          backgroundColor: 'rgba(220, 67, 38, 0.12)',
          pointBackgroundColor: '#DC4326',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 4,
          fill: true,
          tension: 0.35,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: ejes.ticks }, y: { beginAtZero: true, grid: ejes.grid, ticks: ejes.ticks, border: { display: false } } },
      },
    });
  }

  private dibujarCsat(): void {
    if (!this.csat()) return;
    const { promedio, porCategoria } = this.csat()!;

    // Gráfico: CSAT promedio por categoría (pie)
    const crear = (el: HTMLCanvasElement | undefined, config: ChartConfiguration) => {
      if (!el) {
        console.warn('[Dashboard] Canvas no encontrado:', config.type);
        return;
      }
      this.graficos.push(new Chart(el, config));
    };

    crear(this.canvasCsat()?.nativeElement, {
      type: 'pie',
      data: {
        labels: porCategoria.map((c) => c.categoria),
        datasets: [{
          label: 'Promedio CSAT por categoría',
          data: porCategoria.map((c) => c.promedio),
          backgroundColor: ['#2563eb', '#177a52', '#c67a08', '#dc4326', '#b3261e'],
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, color: '#3D424E', font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `CSAT: ${ctx.parsed?.toFixed?.(1) ?? 0} / 5`,
            },
          },
        },
      },
    });
  }

  private dibujarNps(): void {
    if (!this.nps()) return;
    const { resumen } = this.nps()!;

    // Gráfico: Distribución NPS (promotores, pasivos, detractores)
    const crear = (el: HTMLCanvasElement | undefined, config: ChartConfiguration) => {
      if (!el) {
        console.warn('[Dashboard] Canvas no encontrado:', config.type);
        return;
      }
      this.graficos.push(new Chart(el, config));
    };

    crear(this.canvasNps()?.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Promotores (9-10)', 'Pasivos (7-8)', 'Detractores (0-6)'],
        datasets: [{
          data: [resumen.promotores, resumen.pasivos, resumen.detractores],
          backgroundColor: ['#177a52', '#c67a08', '#b3261e'],
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, color: '#3D424E', font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const total = resumen.total_respuestas || 1;
                const pct = ((ctx.parsed ?? 0) / total * 100).toFixed(1);
                return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  private destruir(): void {
    this.graficos.forEach((g) => g.destroy());
    this.graficos = [];
  }

  async exportar(): Promise<void> {
    try {
      const blob = await firstValueFrom(this.dash.exportar());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_tickets.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.error.set('No se pudo exportar el reporte.');
    }
  }
}