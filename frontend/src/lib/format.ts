import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatFecha(iso: string | Date): string {
  const date = typeof iso === "string" ? parseISO(iso) : iso;
  // Las fechas "solo fecha" se serializan como medianoche UTC; formatear en
  // zona local las desplaza un día en husos negativos (CDMX = UTC-6 muestra
  // "14 ago" en lugar de "15 ago"). Detectamos el caso y formateamos en UTC.
  const esDateOnly =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  if (esDateOnly) {
    const localProxy = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
    return format(localProxy, "d MMM yyyy", { locale: es });
  }
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
