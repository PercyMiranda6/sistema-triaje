import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CsatEstado,
  CsatMetrica,
  CsatPorCategoria,
  CsatPorAnalista,
  CsatPorMes,
  NpsResumen,
  NpsPorPeriodo,
} from '../models';

@Injectable({ providedIn: 'root' })
export class EncuestaService {
  private http = inject(HttpClient);
  private readonly api = 'http://localhost:4000/api';

  /** Verificar si el cliente puede responder CSAT para un ticket */
  verificarEstadoCsat(ticketId: number): Observable<CsatEstado> {
    return this.http.get<CsatEstado>(`${this.api}/encuestas/csat/estado/${ticketId}`);
  }

  /** Responder CSAT (cliente, una vez por ticket cerrado/resuelto) */
  responderCsat(ticketId: number, puntuacion: number, comentario?: string) {
    return this.http.post<{ mensaje: string; puntuacion: number }>(
      `${this.api}/encuestas/csat`,
      { ticketId, puntuacion, comentario }
    );
  }

  /** Métricas CSAT (solo analista/administrador) */
  metricasCsat(): Observable<{
    promedio: CsatMetrica;
    porCategoria: CsatPorCategoria[];
    porAnalista: CsatPorAnalista[];
    porMes: CsatPorMes[];
  }> {
    return this.http.get<{
      promedio: CsatMetrica;
      porCategoria: CsatPorCategoria[];
      porAnalista: CsatPorAnalista[];
      porMes: CsatPorMes[];
    }>(`${this.api}/encuestas/csat/metricas`);
  }

  /** Responder NPS (cliente) */
  responderNps(puntuacion: number, comentario?: string, periodo?: string) {
    return this.http.post<{ mensaje: string; puntuacion: number }>(
      `${this.api}/encuestas/nps`,
      { puntuacion, comentario, periodo }
    );
  }

  /** Métricas NPS (solo analista/administrador) */
  metricasNps(): Observable<{
    resumen: NpsResumen;
    porPeriodo: NpsPorPeriodo[];
  }> {
    return this.http.get<{
      resumen: NpsResumen;
      porPeriodo: NpsPorPeriodo[];
    }>(`${this.api}/encuestas/nps/metricas`);
  }
}
