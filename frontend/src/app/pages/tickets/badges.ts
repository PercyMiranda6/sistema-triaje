export function sevClase(sev: string): string {
  return {
    Critica: 'badge-critica',
    Alta: 'badge-alta',
    Media: 'badge-media',
    Baja: 'badge-baja',
  }[sev] || 'badge-media';
}

export function sentClase(sent: string): string {
  return {
    Frustrado: 'badge-frustrado',
    Positivo: 'badge-positivo',
    Neutro: 'badge-neutro',
  }[sent] || 'badge-neutro';
}

export function prioClase(score: number): string {
  if (score >= 80) return 'badge-critica';
  if (score >= 60) return 'badge-alta';
  if (score >= 35) return 'badge-media';
  return 'badge-baja';
}

const ESTADOS_TEXTO: Record<string, string> = {
  nuevo: 'Nuevo',
  asignado: 'Asignado',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  rechazado: 'Rechazado',
};

export function estadoTexto(estado: string): string {
  return ESTADOS_TEXTO[estado] || estado.replace('_', ' ');
}