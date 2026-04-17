export type Rol =
  | "LABORATORIO"
  | "CONTROL_CALIDAD"
  | "ASEGURAMIENTO_CALIDAD"
  | "GERENTE_PLANTA"
  | "DIRECTOR_OPERACIONES";

export interface Usuario {
  id: string | number;
  correo: string;
  nombre: string;
  rol: Rol;
}

export type EstadoActivo = "ACTIVO" | "INACTIVO" | "BAJA";

export interface Equipo {
  id: number;
  codigo: string;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  estado: EstadoActivo;
}

export interface Cliente {
  id: number;
  nombre: string;
  rfc?: string | null;
  correoContacto?: string | null;
  estado: EstadoActivo;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  estado: EstadoActivo;
}

export interface Lote {
  id: number;
  numeroLote: string;
  productoId: number;
  fechaProduccion: string;
  estado: "ABIERTO" | "CERRADO";
}
