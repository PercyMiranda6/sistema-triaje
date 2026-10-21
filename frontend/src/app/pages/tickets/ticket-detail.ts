import { Component, inject, input, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket, Usuario } from '../../models';
import { sevClase, sentClase, prioClase, estadoTexto } from './badges';

@Component({
  selector: 'app-ticket-detail',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './ticket-detail.html',
  styleUrl: './ticket-detail.css',
})
export class TicketDetailComponent implements OnInit {
  id = input<number>(0);
  private ticketSvc = inject(TicketService);
  auth = inject(AuthService);

  ticket = signal<Ticket | null>(null);
  analistas = signal<Usuario[]>([]);
  nuevoEstado = '';
  analistaSeleccionado = 0;
  motivo = '';
  mensaje = signal('');
  error = signal('');
  analistasCargados = signal(false);
  cargando = signal(true);

  sevClase = sevClase;
  sentClase = sentClase;
  prioClase = prioClase;
  estadoTexto = estadoTexto;

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [t, a] = await Promise.all([
        firstValueFrom(this.ticketSvc.obtener(this.id())),
        firstValueFrom(this.ticketSvc.listarAnalistas()),
      ]);
      this.ticket.set(t.ticket);
      this.nuevoEstado = t.ticket.estado;
      this.analistas.set(a.analistas);
      this.analistasCargados.set(true);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo cargar el ticket.');
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarEstado(): Promise<void> {
    this.mensaje.set('');
    this.error.set('');
    try {
      await this.ticketSvc.actualizarEstado(this.id(), this.nuevoEstado).toPromise();
      this.mensaje.set('Estado actualizado correctamente.');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo actualizar.');
    }
  }

  async reasignar(): Promise<void> {
    if (!this.analistaSeleccionado) return;
    this.mensaje.set('');
    this.error.set('');
    try {
      await this.ticketSvc.reasignar(this.id(), this.analistaSeleccionado, this.motivo).toPromise();
      this.mensaje.set('Ticket reasignado correctamente.');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo reasignar.');
    }
  }
}