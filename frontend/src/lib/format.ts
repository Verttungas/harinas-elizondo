import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatFecha(iso: string | Date): string {
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  return format(date, "d MMM yyyy", { locale: es });
}

export function formatFechaHora(iso: string | Date): string {
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  return format(date, "d MMM yyyy, HH:mm", { locale: es });
}

export function formatNumero(valor: number, decimales = 2): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

export function formatPorcentaje(valor: number, decimales = 1): string {
  return `${formatNumero(valor, decimales)}%`;
}
