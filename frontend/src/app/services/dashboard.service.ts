import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DatosDashboard {
  totales: { total: number; abiertos: number; resueltos: number; nuevos: number; criticos_abiertos: number };
  frt_minutos: number;
  mttr: number;
  sla: { total_resueltos: number; dentro_sla: number; pct_cumplimiento: number | null };
  sentimiento: { sentimiento: string; cantidad: number }[];
  estado: { estado: string; cantidad: number }[];
  severidad: { severidad: string; cantidad: number }[];
  categoria: { categoria: string; cantidad: number }[];
  por_dia: { fecha: string; cantidad: number }[];
  analistas: { nombre: string; especialidad: string | null; email: string; asignados: number; resueltos: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly api = 'http://localhost:4000/api/dashboard';

  resumen(): Observable<DatosDashboard> {
    return this.http.get<DatosDashboard>(`${this.api}/resumen`);
  }

  exportar(): Observable<Blob> {
    return this.http.get(`${this.api}/exportar`, { responseType: 'blob' });
  }
}