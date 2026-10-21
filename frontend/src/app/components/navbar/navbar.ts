import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  auth = inject(AuthService);
  router = inject(Router);

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}