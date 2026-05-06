import { z } from "zod";

const roles = [
  "ADMINISTRADOR",
  "LABORATORIO",
  "CONTROL_CALIDAD",
  "ASEGURAMIENTO_CALIDAD",
  "GERENTE_PLANTA",
  "DIRECTOR_OPERACIONES",
] as const;

export const crearUsuarioSchema = z.object({
  correo: z.string().email("Correo inválido").max(120),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(120),
  nombre: z.string().min(1).max(120),
  rol: z.enum(roles),
  activo: z.boolean().default(true),
});

export const actualizarUsuarioSchema = z.object({
  correo: z.string().email("Correo inválido").max(120).optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(120)
    .optional(),
  nombre: z.string().min(1).max(120).optional(),
  rol: z.enum(roles).optional(),
  activo: z.boolean().optional(),
});

export const listUsuariosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(["ACTIVO", "INACTIVO", "TODOS"]).default("TODOS"),
  rol: z.enum([...roles, "TODOS"]).default("TODOS"),
  q: z.string().optional(),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type ListUsuariosQuery = z.infer<typeof listUsuariosQuerySchema>;
