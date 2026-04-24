import type { ReactNode } from "react";

export function FiltersBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-3 items-end p-4 rounded-md border border-border bg-card">
      {children}
    </div>
  );
}
