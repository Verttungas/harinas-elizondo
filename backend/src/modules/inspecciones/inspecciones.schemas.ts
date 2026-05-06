import { z } from "zod";

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Fecha inválida" });

export const resultadoInputSchema = z.object({
  parametroId: z.coerce.bigint(),
  valor: z.number(),
});

export const crearInspeccionSchema = z.object({
  fechaInspeccion: isoDate,
  observaciones: z.string().max(1000).optional(),
  resultados: z.array(resultadoInputSchema).min(1),
  guardarComoBorrador: z.boolean().default(false),
});

export const actualizarInspeccionSchema = z.object({
  fechaInspeccion: isoDate.optional(),
  observaciones: z.string().max(1000).optional(),
  resultados: z.array(resultadoInputSchema).min(1).optional(),
  guardarComoBorrador: z.boolean().optional(),
});

export const listInspeccionesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  loteId: z.coerce.bigint().optional(),
  estado: z.enum(["BORRADOR", "CERRADA", "TODOS"]).default("TODOS"),
  desde: isoDate.optional(),
  hasta: isoDate.optional(),
});

export const loteParamSchema = z.object({
  loteId: z.coerce.bigint({ invalid_type_error: "loteId inválido" }),
});

export type ResultadoInput = z.infer<typeof resultadoInputSchema>;
export type CrearInspeccionInput = z.infer<typeof crearInspeccionSchema>;
export type ActualizarInspeccionInput = z.infer<typeof actualizarInspeccionSchema>;
export type ListInspeccionesQuery = z.infer<typeof listInspeccionesQuerySchema>;
export type LoteParam = z.infer<typeof loteParamSchema>;
