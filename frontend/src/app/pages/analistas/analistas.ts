import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TicketService } from '../../services/ticket.service';
import { Usuario } from '../../models';

@Component({
  selector: 'app-analistas',
  imports: [FormsModule],
  templateUrl: './analistas.html',
  styleUrl: './analistas.css',
})
export class AnalistasComponent {
  private tickets = inject(TicketService);

  analistas = signal<Usuario[]>([]);
  cargando = signal(true);
  mensaje = signal('');
  error = signal('');

  nombre = '';
  email = '';
  password = '';
  especialidad = '';

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const r = await firstValueFrom(this.tickets.listarAnalistas());
      this.analistas.set(r.analistas);
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudieron cargar los analistas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(): Promise<void> {
    this.error.set('');
    this.mensaje.set('');
    try {
      await fetch('http://localhost:4000/api/usuarios/analistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          nombre: this.nombre,
          email: this.email,
          password: this.password,
          especialidad: this.especialidad || null,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      });
      this.mensaje.set('Analista creado correctamente.');
      this.nombre = '';
      this.email = '';
      this.password = '';
      this.especialidad = '';
      await this.cargar();
    } catch {
      this.error.set('No se pudo crear el analista.');
    }
  }
}