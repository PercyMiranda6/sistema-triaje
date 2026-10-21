import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  nombre = '';
  email = '';
  password = '';
  error = signal('');

  async enviar(): Promise<void> {
    this.error.set('');
    try {
      const r = await firstValueFrom(this.auth.registrar({ nombre: this.nombre, email: this.email, password: this.password, rol: 'cliente' }));
      await this.router.navigate(['/nuevo-ticket'], { replaceUrl: true });
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo registrar.');
    }
  }
}