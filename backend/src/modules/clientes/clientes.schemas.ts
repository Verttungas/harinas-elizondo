import { z } from "zod";

const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

export const agregarValorReferenciaSchema = z
  .object({
    parametroId: z.coerce.bigint(),
    limiteInferior: z.number(),
    limiteSuperior: z.number(),
  })
  .refine((v) => v.limiteSuperior > v.limiteInferior, {
    message: "limiteSuperior debe ser mayor que limiteInferior",
    path: ["limiteSuperior"],
  });

export const actualizarValorReferenciaSchema = z
  .object({
    limiteInferior: z.number(),
    limiteSuperior: z.number(),
  })
  .refine((v) => v.limiteSuperior > v.limiteInferior, {
    message: "limiteSuperior debe ser mayor que limiteInferior",
    path: ["limiteSuperior"],
  });

export const crearClienteSchema = z.object({
  claveSap: z.string().min(1).max(20),
  nombre: z.string().min(1).max(200),
  rfc: z.string().regex(rfcRegex, "RFC con formato inválido"),
  domicilio: z.string().optional(),
  contactoNombre: z.string().max(120).optional(),
  contactoCorreo: z.string().email("Correo inválido").optional(),
  contactoTelefono: z.string().max(20).optional(),
  requiereCertificado: z.boolean().default(true),
  valoresReferencia: z.array(agregarValorReferenciaSchema).optional(),
});

export const actualizarClienteSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  rfc: z.string().regex(rfcRegex, "RFC con formato inválido").optional(),
  domicilio: z.string().optional(),
  contactoNombre: z.string().max(120).optional(),
  contactoCorreo: z.string().email("Correo inválido").optional(),
  contactoTelefono: z.string().max(20).optional(),
  requiereCertificado: z.boolean().optional(),
});

export const inactivarClienteSchema = z.object({
  motivo: z.string().min(1),
});

export const listClientesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(["ACTIVO", "INACTIVO", "TODOS"]).default("ACTIVO"),
  requiereCertificado: z.coerce.boolean().optional(),
  q: z.string().optional(),
});

export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type ActualizarClienteInput = z.infer<typeof actualizarClienteSchema>;
export type AgregarValorReferenciaInput = z.infer<typeof agregarValorReferenciaSchema>;
export type ActualizarValorReferenciaInput = z.infer<typeof actualizarValorReferenciaSchema>;
export type InactivarClienteInput = z.infer<typeof inactivarClienteSchema>;
export type ListClientesQuery = z.infer<typeof listClientesQuerySchema>;
