import { z } from "zod";

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Fecha inválida" });

export const crearLoteSchema = z.object({
  numeroLote: z.string().min(1).max(30),
  productoId: z.coerce.bigint(),
  fechaProduccion: isoDate,
  cantidadProducida: z.number().positive().optional(),
  unidadCantidad: z.string().max(20).optional(),
});

export const listLotesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productoId: z.coerce.bigint().optional(),
  desde: isoDate.optional(),
  hasta: isoDate.optional(),
  q: z.string().optional(),
});

export type CrearLoteInput = z.infer<typeof crearLoteSchema>;
export type ListLotesQuery = z.infer<typeof listLotesQuerySchema>;
