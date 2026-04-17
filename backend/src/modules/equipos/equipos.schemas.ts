import { z } from "zod";

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Fecha inválida" });

export const crearParametroSchema = z
  .object({
    clave: z.string().min(1).max(20),
    nombre: z.string().min(1).max(120),
    unidadMedida: z.string().min(1).max(20),
    desviacionAceptable: z.number().positive().optional(),
    limiteInferior: z.number(),
    limiteSuperior: z.number(),
  })
  .refine((v) => v.limiteSuperior > v.limiteInferior, {
    message: "limiteSuperior debe ser mayor que limiteInferior",
    path: ["limiteSuperior"],
  });

export const actualizarParametroSchema = z
  .object({
    nombre: z.string().min(1).max(120).optional(),
    unidadMedida: z.string().min(1).max(20).optional(),
    desviacionAceptable: z.number().positive().optional(),
    limiteInferior: z.number().optional(),
    limiteSuperior: z.number().optional(),
  })
  .refine(
    (v) =>
      v.limiteInferior === undefined ||
      v.limiteSuperior === undefined ||
      v.limiteSuperior > v.limiteInferior,
    {
      message: "limiteSuperior debe ser mayor que limiteInferior",
      path: ["limiteSuperior"],
    },
  );

export const crearEquipoSchema = z.object({
  clave: z.string().min(1).max(20),
  descripcionCorta: z.string().min(1).max(80),
  descripcionLarga: z.string().optional(),
  marca: z.string().max(60).optional(),
  modelo: z.string().max(60).optional(),
  serie: z.string().max(60).optional(),
  proveedor: z.string().max(120).optional(),
  fechaAdquisicion: isoDate.optional(),
  vigenciaGarantia: isoDate.optional(),
  ubicacion: z.string().max(120).optional(),
  responsable: z.string().max(120).optional(),
  parametros: z.array(crearParametroSchema).min(1),
});

export const actualizarEquipoSchema = z.object({
  descripcionCorta: z.string().min(1).max(80).optional(),
  descripcionLarga: z.string().optional(),
  marca: z.string().max(60).optional(),
  modelo: z.string().max(60).optional(),
  serie: z.string().max(60).optional(),
  proveedor: z.string().max(120).optional(),
  fechaAdquisicion: isoDate.optional(),
  vigenciaGarantia: isoDate.optional(),
  ubicacion: z.string().max(120).optional(),
  responsable: z.string().max(120).optional(),
});

export const inactivarEquipoSchema = z.object({
  motivo: z.string().min(1),
});

export const darBajaEquipoSchema = z.object({
  motivo: z.string().min(1),
});

export const listEquiposQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(["ACTIVO", "INACTIVO", "BAJA", "TODOS"]).default("ACTIVO"),
  marca: z.string().optional(),
  q: z.string().optional(),
});

export type CrearParametroInput = z.infer<typeof crearParametroSchema>;
export type ActualizarParametroInput = z.infer<typeof actualizarParametroSchema>;
export type CrearEquipoInput = z.infer<typeof crearEquipoSchema>;
export type ActualizarEquipoInput = z.infer<typeof actualizarEquipoSchema>;
export type InactivarEquipoInput = z.infer<typeof inactivarEquipoSchema>;
export type DarBajaEquipoInput = z.infer<typeof darBajaEquipoSchema>;
export type ListEquiposQuery = z.infer<typeof listEquiposQuerySchema>;
