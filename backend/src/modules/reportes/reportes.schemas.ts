import { z } from "zod";

const tipoReporteSchema = z.enum([
  "parametros",
  "certificados-por-cliente",
  "desviaciones",
  "ficticias",
]);

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Fecha inválida" });

export const resumenQuerySchema = z.object({}).strict();

export const parametrosQuerySchema = z.object({
  parametroId: z.coerce.bigint(),
  desde: isoDate,
  hasta: isoDate,
  clienteId: z.coerce.bigint().optional(),
});

export const certificadosPorClienteQuerySchema = z.object({
  desde: isoDate,
  hasta: isoDate,
});

export const desviacionesQuerySchema = z.object({
  desde: isoDate,
  hasta: isoDate,
  productoId: z.coerce.bigint().optional(),
});

export const ficticiasQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  desde: isoDate.optional(),
  hasta: isoDate.optional(),
});

export const exportQuerySchema = z.object({
  tipo: tipoReporteSchema,
  formato: z.enum(["csv"]).default("csv"),
  parametroId: z.coerce.bigint().optional(),
  clienteId: z.coerce.bigint().optional(),
  productoId: z.coerce.bigint().optional(),
  desde: isoDate.optional(),
  hasta: isoDate.optional(),
});

export const listReportesGuardadosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(["ACTIVO", "INACTIVO", "TODOS"]).default("ACTIVO"),
  tipo: z.enum(["TODOS", ...tipoReporteSchema.options]).default("TODOS"),
  q: z.string().optional(),
});

export const crearReporteGuardadoSchema = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().optional(),
  tipo: tipoReporteSchema,
  filtros: z.record(z.unknown()).default({}),
});

export const actualizarReporteGuardadoSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  descripcion: z.string().optional(),
  tipo: tipoReporteSchema.optional(),
  filtros: z.record(z.unknown()).optional(),
  activo: z.boolean().optional(),
});

export type ParametrosQuery = z.infer<typeof parametrosQuerySchema>;
export type CertificadosPorClienteQuery = z.infer<
  typeof certificadosPorClienteQuerySchema
>;
export type DesviacionesQuery = z.infer<typeof desviacionesQuerySchema>;
export type FicticiasQuery = z.infer<typeof ficticiasQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
export type ListReportesGuardadosQuery = z.infer<
  typeof listReportesGuardadosQuerySchema
>;
export type CrearReporteGuardadoInput = z.infer<
  typeof crearReporteGuardadoSchema
>;
export type ActualizarReporteGuardadoInput = z.infer<
  typeof actualizarReporteGuardadoSchema
>;
