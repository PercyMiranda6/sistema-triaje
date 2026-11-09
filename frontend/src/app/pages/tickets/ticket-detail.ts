import { Component, inject, input, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { EncuestaService } from '../../services/encuesta.service';
import { CsatModalComponent } from '../../components/csat-modal/csat-modal';
import { Ticket, Usuario, CsatEstado } from '../../models';
import { sevClase, sentClase, prioClase, estadoTexto } from './badges';

@Component({
  selector: 'app-ticket-detail',
  imports: [FormsModule, RouterLink, DatePipe, CsatModalComponent],
  templateUrl: './ticket-detail.html',
  styleUrl: './ticket-detail.css',
})
export class TicketDetailComponent implements OnInit {
  id = input<number>(0);
  private ticketSvc = inject(TicketService);
  private encuestaSvc = inject(EncuestaService);
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

  // Control de modal CSAT
  mostrarCsat = signal(false);
  csatRespondido = signal(false);

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

      // Si el cliente es dueño del ticket y está cerrado/resuelto, verificar CSAT
      const usuarioActual = this.auth.usuario();
      if (this.auth.esRol('cliente') && usuarioActual && t.ticket.cliente_id === usuarioActual.id) {
        await this.verificarCsat(t.ticket.id);
      }
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo cargar el ticket.');
    } finally {
      this.cargando.set(false);
    }
  }

  async verificarCsat(ticketId: number): Promise<void> {
    try {
      const estado = await firstValueFrom(this.encuestaSvc.verificarEstadoCsat(ticketId));
      if (estado.mostrarEncuesta) {
        this.mostrarCsat.set(true);
      } else {
        this.csatRespondido.set(estado.yaRespondio);
      }
    } catch (e: any) {
      // Si falla la verificación, no mostramos el modal (no bloqueamos al usuario)
      console.warn('No se pudo verificar estado CSAT:', e);
    }
  }

  onCsatCerrado(respondido: boolean): void {
    this.mostrarCsat.set(false);
    if (respondido) {
      this.csatRespondido.set(true);
      this.mensaje.set('Gracias por calificar la atención.');
      // Recargar para reflejar que ya respondió
      this.cargar();
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