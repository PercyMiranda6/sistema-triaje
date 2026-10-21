import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal('');

  async enviar(): Promise<void> {
    this.error.set('');
    try {
      const r = await firstValueFrom(this.auth.login(this.email, this.password));
      const destino = r.usuario.rol === 'cliente' ? '/nuevo-ticket' : '/bandeja';
      await this.router.navigate([destino], { replaceUrl: true });
    } catch (e: any) {
      this.error.set(e?.error?.error || 'No se pudo iniciar sesión.');
    }
  }
}