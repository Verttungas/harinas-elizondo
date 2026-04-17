import { z } from "zod";

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Fecha inválida" });

const datosEmbarqueSchema = z
  .object({
    numOrdenCompra: z.string().min(1).max(50),
    cantidadSolicitada: z.number().positive(),
    cantidadEntrega: z.number().positive(),
    numFactura: z.string().min(1).max(50),
    fechaEnvio: isoDate,
    fechaCaducidad: isoDate,
  })
  .refine((d) => d.cantidadEntrega <= d.cantidadSolicitada, {
    message: "La cantidad a entregar no puede exceder la solicitada",
    path: ["cantidadEntrega"],
  })
  .refine((d) => new Date(d.fechaCaducidad) >= new Date(d.fechaEnvio), {
    message: "La fecha de caducidad debe ser posterior o igual a la fecha de envío",
    path: ["fechaCaducidad"],
  });

export const emitirCertificadoSchema = z.object({
  clienteId: z.coerce.bigint(),
  loteId: z.coerce.bigint(),
  inspeccionIds: z.array(z.coerce.bigint()).min(1),
  datosEmbarque: datosEmbarqueSchema,
});

export const listCertificadosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  clienteId: z.coerce.bigint().optional(),
  loteId: z.coerce.bigint().optional(),
  estado: z
    .enum(["EMITIDO", "ENVIO_PARCIAL", "ENVIADO", "TODOS"])
    .default("TODOS"),
  desde: isoDate.optional(),
  hasta: isoDate.optional(),
  q: z.string().optional(),
});

export type EmitirCertificadoInput = z.infer<typeof emitirCertificadoSchema>;
export type ListCertificadosQuery = z.infer<typeof listCertificadosQuerySchema>;
