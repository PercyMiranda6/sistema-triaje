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
  cliente_id?: number;
  analista_id?: number | null;
  analista_nombre?: string | null;
  cliente_nombre?: string | null;
  sla_horas?: number | null;
  creado_el?: string;
  primer_respuesta_el?: string | null;
  cerrado_el?: string | null;
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

export interface CsatEstado {
  ticketId: number;
  estado: string;
  yaRespondio: boolean;
  mostrarEncuesta: boolean;
}

export interface CsatMetrica {
  total_respuestas: number;
  promedio: number;
  cincos: number;
  cuatros: number;
  treses: number;
  dos: number;
  unos: number;
}

export interface CsatPorCategoria {
  categoria: string;
  total: number;
  promedio: number;
}

export interface CsatPorAnalista {
  nombre: string;
  especialidad: string | null;
  total: number;
  promedio: number;
}

export interface CsatPorMes {
  mes: string;
  total: number;
  promedio: number;
}

export interface NpsResumen {
  total_respuestas: number;
  promedio: number;
  promotores: number;
  pasivos: number;
  detractores: number;
  nps_score: number;
}

export interface NpsPorPeriodo {
  periodo: string;
  total: number;
  promedio: number;
  nps_score: number;
}