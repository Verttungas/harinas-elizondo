import { z } from "zod";

const tipoReporteSchema = z.enum([
  "parametros",
  "certificados-por-cliente",
  "desviaciones",
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

export const exportQuerySchema = z.object({
  tipo: tipoReporteSchema,
  formato: z.enum(["csv"]).default("csv"),
  parametroId: z.coerce.bigint().optional(),
  clienteId: z.coerce.bigint().optional(),
  productoId: z.coerce.bigint().optional(),
  desde: isoDate.optional(),
  hasta: isoDate.optional(),
});

export type ParametrosQuery = z.infer<typeof parametrosQuerySchema>;
export type CertificadosPorClienteQuery = z.infer<
  typeof certificadosPorClienteQuerySchema
>;
export type DesviacionesQuery = z.infer<typeof desviacionesQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
