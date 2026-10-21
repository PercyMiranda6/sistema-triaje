import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly api = 'http://localhost:4000/api/auth';

  usuario = signal<Usuario | null>(null);

  constructor() {
    const guardado = localStorage.getItem('usuario');
    if (guardado) {
      this.usuario.set(JSON.parse(guardado));
    }
  }

  login(email: string, password: string): Observable<{ token: string; usuario: Usuario }> {
    return this.http.post<{ token: string; usuario: Usuario }>(`${this.api}/login`, { email, password }).pipe(
      tap((r) => {
        localStorage.setItem('token', r.token);
        localStorage.setItem('usuario', JSON.stringify(r.usuario));
        this.usuario.set(r.usuario);
      })
    );
  }

  registrar(datos: { nombre: string; email: string; password: string; rol: string }): Observable<{ token: string; usuario: Usuario }> {
    return this.http.post<{ token: string; usuario: Usuario }>(`${this.api}/registrar`, datos).pipe(
      tap((r) => {
        localStorage.setItem('token', r.token);
        localStorage.setItem('usuario', JSON.stringify(r.usuario));
        this.usuario.set(r.usuario);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.usuario.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  esRol(...roles: string[]): boolean {
    const u = this.usuario();
    return !!u && roles.includes(u.rol);
  }
}