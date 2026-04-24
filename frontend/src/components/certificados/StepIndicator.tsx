import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { num: 1, label: "Cliente" },
  { num: 2, label: "Lote e inspecciones" },
  { num: 3, label: "Datos de embarque" },
  { num: 4, label: "Revisión" },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const completed = current > step.num;
        const active = current === step.num;
        return (
          <li key={step.num} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                completed
                  ? "bg-state-success text-white"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {completed ? <Check className="h-4 w-4" /> : step.num}
            </div>
            <span
              className={cn(
                "text-sm",
                active ? "font-medium" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-8",
                  completed ? "bg-state-success" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
