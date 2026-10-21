import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { Ticket } from '../../models';
import { sevClase, sentClase, prioClase, estadoTexto } from './badges';

@Component({
  selector: 'app-ticket-list',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './ticket-list.html',
  styleUrl: './ticket-list.css',
})
export class TicketListComponent {
  private tickets = inject(TicketService);
  router = inject(Router);

  ticketsSignal = signal<Ticket[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 10;

  filtroEstado = '';
  filtroSeveridad = '';
  filtroCategoria = '';
  cargando = signal(false);
  error = signal('');

  sevClase = sevClase;
  sentClase = sentClase;
  prioClase = prioClase;
  estadoTexto = estadoTexto;

  estados = [
    { v: '', t: 'Todos' },
    { v: 'nuevo', t: 'Nuevos' },
    { v: 'asignado', t: 'Asignados' },
    { v: 'en_proceso', t: 'En proceso' },
    { v: 'resuelto', t: 'Resueltos' },
  ];

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const r = await firstValueFrom(
        this.tickets.listar({
          estado: this.filtroEstado,
          severidad: this.filtroSeveridad,
          categoria: this.filtroCategoria,
          page: this.page(),
          limit: this.pageSize,
        })
      );
      this.ticketsSignal.set(r.tickets);
      this.total.set(r.paginacion.total);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudieron cargar los tickets.');
    } finally {
      this.cargando.set(false);
    }
  }

  aplicarFiltros(): void {
    this.page.set(1);
    this.cargar();
  }

  cambiarPagina(delta: number): void {
    this.page.set(this.page() + delta);
    this.cargar();
  }

  totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }
}