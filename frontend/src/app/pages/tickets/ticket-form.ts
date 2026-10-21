import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { sevClase, sentClase } from './badges';

@Component({
  selector: 'app-ticket-form',
  imports: [FormsModule],
  templateUrl: './ticket-form.html',
  styleUrl: './ticket-form.css',
})
export class TicketFormComponent {
  private tickets = inject(TicketService);
  router = inject(Router);

  sevClase = sevClase;
  sentClase = sentClase;

  asunto = '';
  descripcion = '';
  enviando = signal(false);
  error = signal('');
  resultado = signal<any>(null);

  async enviar(): Promise<void> {
    this.error.set('');
    this.enviando.set(true);
    try {
      const r = await firstValueFrom(this.tickets.crear(this.asunto, this.descripcion));
      this.resultado.set(r.ticket);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo crear el ticket.');
    } finally {
      this.enviando.set(false);
    }
  }
}