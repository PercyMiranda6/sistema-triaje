import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Paginacion, Ticket, Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private http = inject(HttpClient);
  private readonly api = 'http://localhost:4000/api';

  crear(asunto: string, descripcion: string): Observable<{ mensaje: string; ticket: Ticket }> {
    return this.http.post<{ mensaje: string; ticket: Ticket }>(`${this.api}/tickets`, { asunto, descripcion });
  }

  listar(params: { estado?: string; severidad?: string; categoria?: string; page?: number; limit?: number } = {}): Observable<{
    tickets: Ticket[];
    paginacion: Paginacion;
  }> {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    return this.http.get<{ tickets: Ticket[]; paginacion: Paginacion }>(`${this.api}/tickets?${q}`);
  }

  obtener(id: number): Observable<{ ticket: Ticket }> {
    return this.http.get<{ ticket: Ticket }>(`${this.api}/tickets/${id}`);
  }

  actualizarEstado(id: number, estado: string): Observable<{ mensaje: string; nuevoEstado: string }> {
    return this.http.patch<{ mensaje: string; nuevoEstado: string }>(`${this.api}/tickets/${id}/estado`, { estado });
  }

  reasignar(id: number, analistaId: number, motivo?: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.api}/tickets/${id}/reasignar`, {
      analista_id: analistaId,
      motivo,
    });
  }

  listarAnalistas(): Observable<{ analistas: Usuario[] }> {
    return this.http.get<{ analistas: Usuario[] }>(`${this.api}/usuarios/analistas`);
  }
}