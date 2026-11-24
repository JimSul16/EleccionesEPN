/**
 * Modelos de dominio. No dependen de Angular ni de Firebase: los repositorios
 * (capa data/) convierten documentos de Firestore a estas interfaces.
 */

export const ROLES = ['PROVINCIAL', 'RECINTO', 'VEEDOR'] as const;
export type Rol = (typeof ROLES)[number];

export const DIGNIDADES = ['ALCALDE', 'PREFECTO'] as const;
export type Dignidad = (typeof DIGNIDADES)[number];

/** Las cinco organizaciones precargadas (R1). El id es fijo para que las reglas puedan sumar campos. */
export const ORGANIZACION_IDS = ['o1', 'o2', 'o3', 'o4', 'o5'] as const;
export type OrganizacionId = (typeof ORGANIZACION_IDS)[number];

export type Votos = Record<OrganizacionId, number>;

export type EstadoActa = 'REGISTRADA' | 'CORREGIDA';

/** Estado de una mesa visto por los coordinadores. */
export type EstadoMesa = 'SIN_VEEDOR' | 'PENDIENTE' | 'PARCIAL' | 'COMPLETA';

export interface Recinto {
  id: string;
  provincia: string;
  canton: string;
  parroquia: string;
  nombre: string;
  numJrv: number;
  lat?: number;
  lng?: number;
  coordinadorId?: string | null;
}

export interface Jrv {
  /** `${recintoId}_${numero}` */
  id: string;
  recintoId: string;
  numero: number;
  veedorId: string | null;
}

export interface Organizacion {
  id: OrganizacionId;
  nombre: string;
  siglas: string;
  lista: number;
}

export interface Candidato {
  id: string;
  organizacionId: OrganizacionId;
  dignidad: Dignidad;
  nombre: string;
}

export interface Usuario {
  uid: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  rol: Rol;
  recintoId: string | null;
  debeCambiarPassword: boolean;
}

/** Los números que el veedor transcribe del acta física. */
export interface ConteoActa {
  votos: Votos;
  nulos: number;
  blancos: number;
  totalSufragantes: number;
}

export interface Ubicacion {
  lat: number;
  lng: number;
  precisionM: number;
}

export interface Acta extends ConteoActa {
  /** `${jrvId}_${dignidad}`: garantiza una sola acta por mesa y dignidad. */
  id: string;
  jrvId: string;
  recintoId: string;
  dignidad: Dignidad;
  fotoPath: string | null;
  ubicacion: Ubicacion | null;
  estado: EstadoActa;
  version: number;
  registradoPor: string;
  updatedBy: string;
}

export function actaId(jrvId: string, dignidad: Dignidad): string {
  return `${jrvId}_${dignidad}`;
}

export function jrvId(recintoId: string, numero: number): string {
  return `${recintoId}_${numero}`;
}

/** Ruta en Storage de la foto de un acta. Debe coincidir con storage.rules. */
export function rutaFotoActa(recintoId: string, jrv: string, dignidad: Dignidad, uuid: string): string {
  return `actas/${recintoId}/${jrv}/${dignidad}-${uuid}.jpg`;
}

/** Estado de la mesa según su veedor y cuántas actas (0, 1 o 2) tiene registradas. */
export function estadoMesa(veedorId: string | null, actasRegistradas: number): EstadoMesa {
  if (actasRegistradas >= DIGNIDADES.length) return 'COMPLETA';
  if (actasRegistradas > 0) return 'PARCIAL';
  return veedorId ? 'PENDIENTE' : 'SIN_VEEDOR';
}

/** Jerarquía de creación de cuentas (R2): quién puede crear a quién. */
export function puedeCrear(creador: Rol, nuevo: Rol): boolean {
  return (creador === 'PROVINCIAL' && nuevo === 'RECINTO') || (creador === 'RECINTO' && nuevo === 'VEEDOR');
}
