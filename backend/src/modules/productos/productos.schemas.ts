import { z } from "zod";

export const crearProductoSchema = z.object({
  clave: z.string().min(1).max(20),
  nombre: z.string().min(1).max(120),
  descripcion: z.string().optional(),
});

export const listProductosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
});

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ListProductosQuery = z.infer<typeof listProductosQuerySchema>;
