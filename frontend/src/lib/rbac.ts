import type { Rol } from "@/types/domain.types";

export const navAccessByRole: Record<Rol, string[]> = {
  ADMINISTRADOR: [
    "/dashboard",
    "/usuarios",
    "/equipos",
    "/clientes",
    "/lotes",
    "/inspecciones",
    "/certificados",
    "/reportes",
  ],
  CONTROL_CALIDAD: [
    "/dashboard",
    "/equipos",
    "/clientes",
    "/lotes",
    "/inspecciones",
    "/certificados",
    "/reportes",
  ],
  LABORATORIO: [
    "/dashboard",
    "/lotes",
    "/inspecciones",
    "/certificados",
  ],
  ASEGURAMIENTO_CALIDAD: [
    "/dashboard",
    "/inspecciones",
    "/certificados",
    "/reportes",
  ],
  GERENTE_PLANTA: ["/dashboard", "/certificados", "/reportes"],
  DIRECTOR_OPERACIONES: ["/dashboard", "/certificados", "/reportes"],
};

export function rolPuedeVerRuta(rol: Rol | undefined, ruta: string): boolean {
  if (!rol) return false;
  return navAccessByRole[rol].includes(ruta);
}

export const rolesEscrituraClientes: Rol[] = ["CONTROL_CALIDAD", "ADMINISTRADOR"];
export const rolesEscrituraEquipos: Rol[] = ["CONTROL_CALIDAD", "ADMINISTRADOR"];
export const rolesEscrituraLotes: Rol[] = [
  "CONTROL_CALIDAD",
  "LABORATORIO",
  "ADMINISTRADOR",
];
export const rolesEscrituraInspecciones: Rol[] = [
  "CONTROL_CALIDAD",
  "LABORATORIO",
  "ADMINISTRADOR",
];
export const rolesEscrituraCertificados: Rol[] = [
  "CONTROL_CALIDAD",
  "ADMINISTRADOR",
];
export const rolesAdministracionUsuarios: Rol[] = ["ADMINISTRADOR"];
export const rolesLecturaReportes: Rol[] = [
  "CONTROL_CALIDAD",
  "ASEGURAMIENTO_CALIDAD",
  "GERENTE_PLANTA",
  "DIRECTOR_OPERACIONES",
  "ADMINISTRADOR",
];
