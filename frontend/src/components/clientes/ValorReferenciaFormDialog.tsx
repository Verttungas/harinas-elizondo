import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Equipo, Parametro } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";
import { toNumber } from "@/lib/number";

export interface ValorReferenciaFormValues {
  parametroId: string;
  limiteInferior: number;
  limiteSuperior: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ValorReferenciaFormValues) => void | Promise<void>;
  excluirParametroIds?: string[];
}

export function ValorReferenciaFormDialog({
  open,
  onOpenChange,
  onSubmit,
  excluirParametroIds = [],
}: Props) {
  const [equipoId, setEquipoId] = useState<string>("");
  const [parametroId, setParametroId] = useState<string>("");
  const [limInf, setLimInf] = useState<string>("");
  const [limSup, setLimSup] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const equiposQuery = useQuery(
    () =>
      api
        .get<PaginatedResponse<Equipo>>("/equipos", {
          params: { estado: "ACTIVO", limit: 100 },
        })
        .then((r) => r.data.data),
    [],
  );

  const equipoSeleccionado = useQuery(
    () =>
      equipoId
        ? api.get<Equipo>(`/equipos/${equipoId}`).then((r) => r.data)
        : Promise.resolve(null as Equipo | null),
    [equipoId],
  );

  useEffect(() => {
    if (!open) {
      setEquipoId("");
      setParametroId("");
      setLimInf("");
      setLimSup("");
      setError(null);
    }
  }, [open]);

  const parametroActual: Parametro | undefined =
    equipoSeleccionado.data?.parametros?.find(
      (p) => String(p.id) === parametroId,
    );

  const handleSubmit = async () => {
    setError(null);
    if (!parametroId) {
      setError("Seleccione un parámetro");
      return;
    }
    const li = Number(limInf);
    const ls = Number(limSup);
    if (Number.isNaN(li) || Number.isNaN(ls)) {
      setError("Los límites deben ser numéricos");
      return;
    }
    if (ls <= li) {
      setError("El límite superior debe ser mayor al inferior");
      return;
    }
    if (parametroActual) {
      const intInf = toNumber(parametroActual.limiteInferior);
      const intSup = toNumber(parametroActual.limiteSuperior);
      if (li < intInf || ls > intSup) {
        setError(
          `El rango particular debe estar dentro del rango internacional [${intInf}, ${intSup}]`,
        );
        return;
      }
    }
    await onSubmit({
      parametroId,
      limiteInferior: li,
      limiteSuperior: ls,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Agregar valor de referencia particular</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Equipo</Label>
            <Select value={equipoId} onValueChange={setEquipoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione equipo..." />
              </SelectTrigger>
              <SelectContent>
                {(equiposQuery.data ?? []).map((e) => (
                  <SelectItem key={String(e.id)} value={String(e.id)}>
                    {e.clave} — {e.descripcionCorta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Parámetro</Label>
            <Select
              value={parametroId}
              onValueChange={setParametroId}
              disabled={!equipoId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione parámetro..." />
              </SelectTrigger>
              <SelectContent>
                {(equipoSeleccionado.data?.parametros ?? [])
                  .filter((p) => !excluirParametroIds.includes(String(p.id)))
                  .map((p) => (
                    <SelectItem key={String(p.id)} value={String(p.id)}>
                      {p.clave} — {p.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {parametroActual && (
            <div className="text-xs text-muted-foreground p-2 rounded bg-secondary/30">
              Rango internacional: [{toNumber(parametroActual.limiteInferior)},{" "}
              {toNumber(parametroActual.limiteSuperior)}]{" "}
              {parametroActual.unidadMedida}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Límite inferior</Label>
              <Input
                type="number"
                step="any"
                value={limInf}
                onChange={(e) => setLimInf(e.target.value)}
              />
            </div>
            <div>
              <Label>Límite superior</Label>
              <Input
                type="number"
                step="any"
                value={limSup}
                onChange={(e) => setLimSup(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-xs text-state-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
