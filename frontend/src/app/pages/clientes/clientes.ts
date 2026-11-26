import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../services/user.service';
import { Usuario } from '../../models';

@Component({
  selector: 'app-clientes',
  imports: [FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class ClientesComponent {
  private usuarios = inject(UserService);

  clientes = signal<Usuario[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(1);
  cargando = signal(true);
  mensaje = signal('');
  error = signal('');

  nombre = '';
  email = '';
  password = '';
  editandoId: number | null = null;

  constructor() { this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const r = await firstValueFrom(this.usuarios.listarClientes(this.pagina()));
      this.clientes.set(r.clientes);
      this.total.set(r.paginacion.total);
      this.totalPaginas.set(Math.max(1, r.paginacion.totalPaginas));
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudieron cargar los clientes.');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    this.error.set('');
    this.mensaje.set('');
    try {
      if (this.editandoId) {
        await firstValueFrom(this.usuarios.actualizar(this.editandoId, {
          nombre: this.nombre,
          email: this.email,
          password: this.password || undefined,
        }));
        this.mensaje.set('Cliente actualizado correctamente.');
      } else {
        await firstValueFrom(this.usuarios.crearCliente({ nombre: this.nombre, email: this.email, password: this.password }));
        this.mensaje.set('Cliente creado correctamente.');
      }
      this.limpiarFormulario();
      await this.cargar();
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo guardar el cliente.');
    }
  }

  editar(cliente: Usuario): void {
    this.editandoId = cliente.id;
    this.nombre = cliente.nombre;
    this.email = cliente.email;
    this.password = '';
    this.error.set('');
    this.mensaje.set('');
  }

  async eliminar(cliente: Usuario): Promise<void> {
    if (!confirm(`¿Desactivar a ${cliente.nombre}?`)) return;
    try {
      await firstValueFrom(this.usuarios.eliminar(cliente.id));
      this.mensaje.set('Cliente desactivado correctamente.');
      if (this.clientes().length === 1 && this.pagina() > 1) this.pagina.update((p) => p - 1);
      await this.cargar();
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo desactivar el cliente.');
    }
  }

  cambiarPagina(delta: number): void {
    const siguiente = this.pagina() + delta;
    if (siguiente < 1 || siguiente > this.totalPaginas()) return;
    this.pagina.set(siguiente);
    this.cargar();
  }

  cancelarEdicion(): void { this.limpiarFormulario(); }

  private limpiarFormulario(): void {
    this.editandoId = null;
    this.nombre = '';
    this.email = '';
    this.password = '';
  }
}
