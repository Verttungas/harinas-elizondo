import type { Rol } from "@/types/domain.types";

export const navAccessByRole: Record<Rol, string[]> = {
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
    "/reportes",
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

export const rolesEscrituraEquipos: Rol[] = ["CONTROL_CALIDAD"];
export const rolesEscrituraClientes: Rol[] = ["CONTROL_CALIDAD"];
export const rolesEscrituraLotes: Rol[] = ["CONTROL_CALIDAD", "LABORATORIO"];
export const rolesEscrituraInspecciones: Rol[] = [
  "CONTROL_CALIDAD",
  "LABORATORIO",
];
export const rolesEscrituraCertificados: Rol[] = ["CONTROL_CALIDAD"];
