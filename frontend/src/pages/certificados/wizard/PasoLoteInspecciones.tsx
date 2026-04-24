import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { api, handleApiError } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import type { Inspeccion, Lote } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

interface Props {
  lote?: Lote;
  inspecciones?: Inspeccion[];
  onConfirm: (lote: Lote, inspecciones: Inspeccion[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function PasoLoteInspecciones({
  lote,
  inspecciones,
  onConfirm,
  onNext,
  onPrev,
}: Props) {
  const [numero, setNumero] = useState(lote?.numeroLote ?? "");
  const [candidato, setCandidato] = useState<Lote | null>(lote ?? null);
  const [disponibles, setDisponibles] = useState<Inspeccion[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(
    new Set(inspecciones?.map((i) => String(i.id)) ?? []),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (candidato) void cargarInspecciones(candidato);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarInspecciones = async (l: Lote) => {
    setLoading(true);
    try {
      const r = await api.get<PaginatedResponse<Inspeccion>>("/inspecciones", {
        params: { loteId: l.id, estado: "CERRADA", limit: 100 },
      });
      setDisponibles(r.data.data);
    } catch (err) {
      setDisponibles([]);
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const buscar = async () => {
    if (!numero) return;
    setLoading(true);
    try {
      const r = await api.get<PaginatedResponse<Lote>>("/lotes", {
        params: { q: numero, limit: 10 },
      });
      const found = r.data.data.find((l) => l.numeroLote === numero);
      if (!found) {
        toast.error("Lote no encontrado");
        return;
      }
      setCandidato(found);
      await cargarInspecciones(found);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmar = () => {
    if (!candidato) return;
    const seleccionadasArr = disponibles.filter((i) =>
      seleccionadas.has(String(i.id)),
    );
    if (seleccionadasArr.length === 0) {
      toast.error("Seleccione al menos una inspección");
      return;
    }
    onConfirm(candidato, seleccionadasArr);
    onNext();
  };

  const algunaFicticia = disponibles
    .filter((i) => seleccionadas.has(String(i.id)))
    .some((i) => i.esFicticia);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        == Paso 2: Lote e inspecciones ==
      </h2>

      <div className="flex gap-2 items-end">
        <div className="flex-1 max-w-md">
          <Label className="text-xs">Número de lote</Label>
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Ej. L-2026-0412"
          />
        </div>
        <Button onClick={() => void buscar()} disabled={loading || !numero}>
          Buscar
        </Button>
      </div>

      {candidato && (
        <div className="p-3 rounded bg-secondary/30 text-sm">
          <p>
            <strong>{candidato.numeroLote}</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Producido: {formatFecha(candidato.fechaProduccion)}
          </p>
        </div>
      )}

      {candidato && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Inspecciones cerradas del lote</p>
          {disponibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay inspecciones cerradas en este lote.
            </p>
          ) : (
            <ul className="rounded-md border border-border bg-card divide-y">
              {disponibles.map((i) => (
                <li key={String(i.id)} className="p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={seleccionadas.has(String(i.id))}
                    onChange={() => toggle(String(i.id))}
                  />
                  <span className="font-mono text-sm w-8">{i.secuencia}</span>
                  <span className="flex-1 text-sm">
                    {formatFecha(i.fechaInspeccion)}
                  </span>
                  <StatusBadge status={i.estado} />
                  {i.esFicticia && (
                    <StatusBadge status="BORRADOR" label="Ficticia" />
                  )}
                </li>
              ))}
            </ul>
          )}
          {algunaFicticia && (
            <div className="text-xs text-state-warning p-2 rounded bg-state-warning/5 border border-state-warning/30">
              Está incluyendo al menos una inspección ficticia en el
              certificado.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Anterior
        </Button>
        <Button onClick={confirmar}>Siguiente</Button>
      </div>
    </section>
  );
}
