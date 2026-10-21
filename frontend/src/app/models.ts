export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'cliente' | 'analista' | 'administrador';
  especialidad?: string | null;
  activo?: boolean;
  carga_activa?: number;
}

export interface Ticket {
  id: number;
  codigo: string;
  asunto: string;
  descripcion_original: string;
  descripcion_anonimizada?: string | null;
  categoria: 'Hardware' | 'Software' | 'Redes' | 'Accesos' | 'Base de Datos';
  severidad: 'Baja' | 'Media' | 'Alta' | 'Critica';
  sentimiento: 'Positivo' | 'Neutro' | 'Frustrado';
  score_frustracion: number;
  priority_score: number;
  estado: 'nuevo' | 'asignado' | 'en_proceso' | 'resuelto' | 'cerrado' | 'rechazado';
  analista_id?: number | null;
  analista_nombre?: string | null;
  cliente_nombre?: string | null;
  sla_horas?: number | null;
  creado_el?: string;
  resuelto_el?: string | null;
  proveedor_ia?: string | null;
  motivo_reasignacion?: string | null;
}

export interface Paginacion {
  page: number;
  limit: number;
  total: number;
  totalPaginas: number;
}