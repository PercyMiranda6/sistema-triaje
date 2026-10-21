import { Component, inject, signal, ElementRef, viewChild, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import Chart from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';
import { DashboardService, DatosDashboard } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnDestroy {
  private dash = inject(DashboardService);

  datos = signal<DatosDashboard | null>(null);
  cargando = signal(true);
  error = signal('');

  canvasEstado = viewChild<ElementRef<HTMLCanvasElement>>('canvasEstado');
  canvasSeveridad = viewChild<ElementRef<HTMLCanvasElement>>('canvasSeveridad');
  canvasCategoria = viewChild<ElementRef<HTMLCanvasElement>>('canvasCategoria');
  canvasPorDia = viewChild<ElementRef<HTMLCanvasElement>>('canvasPorDia');

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
      d = await firstValueFrom(this.dash.resumen());
      this.datos.set(d);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudieron cargar las métricas.');
    } finally {
      this.cargando.set(false);
    }

    // Dibuja cuando los canvas ya están montados y con tamaño (un frame después del render).
    if (d) {
      setTimeout(() => this.dibujar(d!), 0);
    }
  }

  private dibujar(d: DatosDashboard): void {
    this.destruir();

    const COLOR_ESTADO: Record<string, string> = {
      nuevo: '#94a3b8',
      asignado: '#2563eb',
      en_proceso: '#f59e0b',
      resuelto: '#22c55e',
      cerrado: '#64748b',
      rechazado: '#ef4444',
    };
    const COLOR_SEV: Record<string, string> = {
      Critica: '#dc2626',
      Alta: '#f97316',
      Media: '#eab308',
      Baja: '#22c55e',
    };
    const COLOR_CAT = ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

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
      plugins: { legend: { position: 'right' as const, labels: { boxWidth: 12, padding: 12 } } },
    });

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
          backgroundColor: d.estado.map((e) => COLOR_ESTADO[e.estado] || '#94a3b8'),
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
          backgroundColor: d.severidad.map((s) => COLOR_SEV[s.severidad] || '#94a3b8'),
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });

    crear(this.canvasCategoria()?.nativeElement, {
      type: 'pie',
      data: {
        labels: d.categoria.map((c) => c.categoria),
        datasets: [{
          data: d.categoria.map((c) => c.cantidad),
          backgroundColor: COLOR_CAT,
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
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          fill: true,
          tension: 0.3,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
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