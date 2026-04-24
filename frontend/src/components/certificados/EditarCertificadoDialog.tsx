import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, handleApiError } from "@/lib/api";
import type { Inspeccion, ResultadoInspeccion } from "@/types/domain.types";
import { toNumber } from "@/lib/number";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspeccionOrigen: Inspeccion;
  onCreated: () => void;
}

export function EditarCertificadoDialog({
  open,
  onOpenChange,
  inspeccionOrigen,
  onCreated,
}: Props) {
  const resultadosOriginales: ResultadoInspeccion[] =
    inspeccionOrigen.resultados ?? [];

  const [valores, setValores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of resultadosOriginales) {
      init[String(r.parametroId)] = String(toNumber(r.valor));
    }
    return init;
  });
  const [justificacion, setJustificacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    if (justificacion.trim().length < 10) {
      setError("La justificación debe tener al menos 10 caracteres");
      return;
    }
    const resultados = Object.entries(valores)
      .filter(([, v]) => v !== "")
      .map(([parametroId, valor]) => ({
        parametroId,
        valor: Number(valor),
      }));

    setLoading(true);
    try {
      await api.post(`/inspecciones/${inspeccionOrigen.id}/ficticia`, {
        justificacion: justificacion.trim(),
        resultados,
      });
      toast.success("Inspección ficticia creada");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generar inspección ficticia</DialogTitle>
          <DialogDescription>
            La inspección original se conserva intacta. La ficticia consumirá
            una letra adicional en la secuencia del lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
            {resultadosOriginales.map((r) => (
              <div
                key={String(r.id)}
                className="grid grid-cols-3 items-center gap-2"
              >
                <div className="text-sm">
                  <span className="font-mono">{r.parametro?.clave ?? "—"}</span>{" "}
                  — {r.parametro?.nombre ?? ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  Original: {toNumber(r.valor)}
                </div>
                <Input
                  type="number"
                  step="any"
                  value={valores[String(r.parametroId)] ?? ""}
                  onChange={(e) =>
                    setValores((prev) => ({
                      ...prev,
                      [String(r.parametroId)]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div>
            <Label>Justificación *</Label>
            <Textarea
              rows={3}
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Motivo del ajuste..."
            />
          </div>
          {error && <p className="text-xs text-state-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={loading}
          >
            Crear ficticia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
