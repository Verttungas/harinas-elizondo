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

export interface Parametro {
  id: string | number;
  equipoId: string | number;
  clave: string;
  nombre: string;
  unidadMedida: string;
  desviacionAceptable?: string | number | null;
  limiteInferior: string | number;
  limiteSuperior: string | number;
  activo: boolean;
}

export interface Equipo {
  id: string | number;
  clave: string;
  descripcionCorta: string;
  descripcionLarga?: string | null;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  proveedor?: string | null;
  fechaAdquisicion?: string | null;
  vigenciaGarantia?: string | null;
  ubicacion?: string | null;
  responsable?: string | null;
  estado: EstadoActivo;
  motivoBaja?: string | null;
  parametros?: Parametro[];
}

export interface ValorReferenciaParticular {
  id: string | number;
  clienteId: string | number;
  parametroId: string | number;
  limiteInferior: string | number;
  limiteSuperior: string | number;
  parametro?: Parametro;
}

export interface Cliente {
  id: string | number;
  claveSap: string;
  nombre: string;
  rfc: string;
  domicilio?: string | null;
  contactoNombre?: string | null;
  contactoCorreo?: string | null;
  contactoTelefono?: string | null;
  requiereCertificado: boolean;
  estado: "ACTIVO" | "INACTIVO";
  valoresReferencia?: ValorReferenciaParticular[];
}

export interface Producto {
  id: string | number;
  clave: string;
  nombre: string;
  descripcion?: string | null;
}

export interface Lote {
  id: string | number;
  numeroLote: string;
  productoId: string | number;
  fechaProduccion: string;
  cantidadProducida?: string | number | null;
  unidadCantidad?: string | null;
  producto?: Producto;
}

export interface ResultadoInspeccion {
  id: string | number;
  inspeccionId: string | number;
  parametroId: string | number;
  valor: string | number;
  desviacion?: string | number | null;
  dentroEspecificacion: boolean;
  parametro?: Parametro & { equipo?: Equipo };
}

export type EstadoInspeccion = "BORRADOR" | "CERRADA";

export interface Inspeccion {
  id: string | number;
  loteId: string | number;
  secuencia: string;
  fechaInspeccion: string;
  estado: EstadoInspeccion;
  esFicticia: boolean;
  observaciones?: string | null;
  justificacionAjuste?: string | null;
  inspeccionOrigenId?: string | number | null;
  inspeccionOrigen?: { id: string | number; secuencia: string; esFicticia?: boolean } | null;
  lote?: Lote;
  resultados?: ResultadoInspeccion[];
  _count?: { resultados: number };
}

export type EstadoCertificado = "EMITIDO" | "ENVIO_PARCIAL" | "ENVIADO";

export interface EnvioCertificado {
  id: string | number;
  certificadoId: string | number;
  destinatarioTipo: "CLIENTE" | "ALMACEN";
  destinatarioCorreo: string;
  estado: "PENDIENTE" | "ENVIADO" | "FALLIDO";
  intentos: number;
  enviadoEn?: string | null;
  ultimoError?: string | null;
  creadoEn?: string;
}

export interface Certificado {
  id: string | number;
  numero: string;
  clienteId: string | number;
  loteId: string | number;
  estado: EstadoCertificado;
  fechaEmision: string;
  numOrdenCompra: string;
  cantidadSolicitada: string | number;
  cantidadEntrega: string | number;
  numFactura: string;
  fechaEnvio: string;
  fechaCaducidad: string;
  rutaPdf?: string | null;
  cliente?: Cliente;
  lote?: Lote;
  certificadoInspeccion?: Array<{
    inspeccion: Inspeccion;
    orden: number;
  }>;
  envios?: EnvioCertificado[];
  _count?: { envios: number };
}

export interface DatosEmbarque {
  numOrdenCompra: string;
  cantidadSolicitada: number;
  cantidadEntrega: number;
  numFactura: string;
  fechaEnvio: string;
  fechaCaducidad: string;
}

export interface SaldoLote {
  loteId: string;
  producida: string | null;
  entregada: string;
  disponible: string | null;
  unidadCantidad: string | null;
}

export interface ResumenReporte {
  certificadosEmitidos: { valor: number; variacionMesAnterior: number };
  lotesEnEspecificacion: { valor: number; variacionPuntos: number };
  clientesActivos: { valor: number };
  inspeccionesFicticias: { valor: number };
}
