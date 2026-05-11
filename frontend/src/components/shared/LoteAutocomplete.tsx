import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import type { Lote } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (lote: Lote) => void;
  placeholder?: string;
  limit?: number;
}

export function LoteAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Buscar...",
  limit = 8,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Lote[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedValue = useDebounce(value, 250);

  useEffect(() => {
    const q = debouncedValue.trim();
    if (q.length < 1) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<PaginatedResponse<Lote>>("/lotes", { params: { q, limit } })
      .then((r) => {
        if (!cancelled) {
          setItems(r.data.data);
          setHighlight(0);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedValue, limit]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (lote: Lote) => {
    onChange(lote.numeroLote);
    onSelect?.(lote);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = items[highlight];
      if (selected) handleSelect(selected);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && (loading || items.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {loading && items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Buscando...
            </div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1 text-sm">
              {items.map((lote, idx) => (
                <li
                  key={String(lote.id)}
                  className={`cursor-pointer px-3 py-1.5 ${
                    idx === highlight
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(lote);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <span className="font-mono">{lote.numeroLote}</span>
                  {lote.producto && (
                    <span className="ml-2 text-muted-foreground">
                      — {lote.producto.clave} {lote.producto.nombre}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
