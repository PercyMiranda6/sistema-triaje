import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Paginacion, Usuario } from '../models';
import { API_BASE } from '../api.config';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly api = API_BASE;

  listarAnalistas(): Observable<{ analistas: Usuario[] }> {
    return this.http.get<{ analistas: Usuario[] }>(`${this.api}/usuarios/analistas`);
  }

  listarClientes(page = 1): Observable<{ clientes: Usuario[]; paginacion: Paginacion }> {
    return this.http.get<{ clientes: Usuario[]; paginacion: Paginacion }>(`${this.api}/usuarios/clientes?page=${page}`);
  }

  crearAnalista(datos: { nombre: string; email: string; password: string; especialidad: string | null }) {
    return this.http.post<{ mensaje: string; id: number }>(`${this.api}/usuarios/analistas`, datos);
  }

  crearCliente(datos: { nombre: string; email: string; password: string }) {
    return this.http.post<{ mensaje: string; id: number }>(`${this.api}/usuarios/clientes`, datos);
  }

  actualizar(id: number, datos: { nombre: string; email: string; password?: string; especialidad?: string | null }) {
    return this.http.patch<{ mensaje: string }>(`${this.api}/usuarios/${id}`, datos);
  }

  eliminar(id: number) {
    return this.http.delete<{ mensaje: string }>(`${this.api}/usuarios/${id}`);
  }
}
