import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "danger" | "neutral";

const STATE_MAP: Record<string, Variant> = {
  ACTIVO: "success",
  ENVIADO: "success",
  CERRADA: "success",
  INACTIVO: "warning",
  ENVIO_PARCIAL: "warning",
  BORRADOR: "warning",
  BAJA: "danger",
  FALLIDO: "danger",
};

const VARIANT_CLASSES: Record<Variant, string> = {
  success: "bg-state-success/10 text-state-success border-state-success/20",
  warning: "bg-state-warning/10 text-state-warning border-state-warning/30",
  danger: "bg-state-danger/10 text-state-danger border-state-danger/20",
  neutral: "bg-secondary text-secondary-foreground border-border",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = STATE_MAP[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {label ?? status}
    </span>
  );
}
