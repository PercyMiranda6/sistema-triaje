import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../services/user.service';
import { Usuario } from '../../models';

@Component({
  selector: 'app-analistas',
  imports: [FormsModule],
  templateUrl: './analistas.html',
  styleUrl: './analistas.css',
})
export class AnalistasComponent {
  private usuarios = inject(UserService);

  analistas = signal<Usuario[]>([]);
  cargando = signal(true);
  mensaje = signal('');
  error = signal('');

  nombre = '';
  email = '';
  password = '';
  especialidad = '';
  editandoId: number | null = null;

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const r = await firstValueFrom(this.usuarios.listarAnalistas());
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
      const datos = { nombre: this.nombre, email: this.email, password: this.password, especialidad: this.especialidad || null };
      if (this.editandoId) {
        await firstValueFrom(this.usuarios.actualizar(this.editandoId, datos));
        this.mensaje.set('Analista actualizado correctamente.');
      } else {
        await firstValueFrom(this.usuarios.crearAnalista(datos));
        this.mensaje.set('Analista creado correctamente.');
      }
      this.limpiarFormulario();
      await this.cargar();
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo guardar el analista.');
    }
  }

  editar(a: Usuario): void {
    this.editandoId = a.id;
    this.nombre = a.nombre;
    this.email = a.email;
    this.password = '';
    this.especialidad = a.especialidad || '';
    this.mensaje.set('');
    this.error.set('');
  }

  async eliminar(a: Usuario): Promise<void> {
    if (!confirm(`¿Desactivar a ${a.nombre}?`)) return;
    try {
      await firstValueFrom(this.usuarios.eliminar(a.id));
      this.mensaje.set('Analista desactivado correctamente.');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo desactivar el analista.');
    }
  }

  cancelarEdicion(): void { this.limpiarFormulario(); }

  private limpiarFormulario(): void {
    this.editandoId = null;
    this.nombre = '';
    this.email = '';
    this.password = '';
    this.especialidad = '';
  }
}
