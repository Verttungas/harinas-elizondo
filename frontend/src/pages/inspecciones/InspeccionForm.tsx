import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Info, ChevronDown, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CrearLoteDialog } from "@/components/lotes/CrearLoteDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, handleApiError } from "@/lib/api";
import type {
  Equipo,
  Inspeccion,
  Lote,
  Parametro,
} from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";
import { toNumber, evaluarValor } from "@/lib/number";

const nextSecuencia = (last?: string) => {
  if (!last) return "A";
  const code = last.charCodeAt(0);
  if (code < 65 || code > 89) return "—";
  return String.fromCharCode(code + 1);
};

interface EquipoConParametros {
  equipo: Equipo;
  parametros: Parametro[];
}

export function InspeccionForm() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!editId;
  const initialLoteId = searchParams.get("loteId") ?? "";

  const [loteNumero, setLoteNumero] = useState("");
  const [lote, setLote] = useState<Lote | null>(null);
  const [loteError, setLoteError] = useState<string | null>(null);
  const [buscandoLote, setBuscandoLote] = useState(false);

  const [inspeccionesPrev, setInspeccionesPrev] = useState<Inspeccion[]>([]);
  const [equipos, setEquipos] = useState<EquipoConParametros[]>([]);
  const [resultados, setResultados] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [crearLoteOpen, setCrearLoteOpen] = useState(false);
  const [sugerencias, setSugerencias] = useState<Lote[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const loteNumeroDebounced = useDebounce(loteNumero, 250);
  const [equiposExpandidos, setEquiposExpandidos] = useState<Set<string>>(
    new Set(),
  );

  const equiposConResultados = useMemo(() => {
    const set = new Set<string>();
    for (const { equipo, parametros } of equipos) {
      if (parametros.some((p) => (resultados[String(p.id)] ?? "") !== "")) {
        set.add(String(equipo.id));
      }
    }
    return set;
  }, [equipos, resultados]);

  const isEquipoExpandido = (equipoId: string) =>
    equiposExpandidos.has(equipoId) || equiposConResultados.has(equipoId);

  const toggleEquipo = (equipoId: string) => {
    setEquiposExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(equipoId)) next.delete(equipoId);
      else next.add(equipoId);
      return next;
    });
  };

  useEffect(() => {
    if (isEdit && editId) {
      void cargarInspeccionExistente(editId);
    } else if (initialLoteId) {
      void buscarLotePorId(initialLoteId);
    }
    void cargarEquipos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarInspeccionExistente = async (inspeccionId: string) => {
    setBuscandoLote(true);
    setLoteError(null);
    try {
      const r = await api.get<Inspeccion>(`/inspecciones/${inspeccionId}`);
      const insp = r.data;
      if (insp.loteId) {
        await buscarLotePorId(String(insp.loteId));
      }
      setFecha(insp.fechaInspeccion.slice(0, 10));
      setObservaciones(insp.observaciones ?? "");
      const prefill: Record<string, string> = {};
      for (const res of insp.resultados ?? []) {
        prefill[String(res.parametroId)] = String(Number(res.valor));
      }
      setResultados(prefill);
    } catch (err) {
      setLoteError(handleApiError(err));
    } finally {
      setBuscandoLote(false);
    }
  };

  const buscarLotePorId = async (id: string) => {
    setBuscandoLote(true);
    setLoteError(null);
    try {
      const r = await api.get<Lote>(`/lotes/${id}`);
      setLote(r.data);
      setLoteNumero(r.data.numeroLote);
      const insp = await api.get<PaginatedResponse<Inspeccion>>(
        "/inspecciones",
        { params: { loteId: r.data.id, limit: 100 } },
      );
      setInspeccionesPrev(insp.data.data);
    } catch (err) {
      setLoteError(handleApiError(err));
    } finally {
      setBuscandoLote(false);
    }
  };

  useEffect(() => {
    if (
      !loteNumeroDebounced ||
      loteNumeroDebounced === lote?.numeroLote ||
      loteNumeroDebounced.length < 1
    ) {
      setSugerencias([]);
      return;
    }
    let cancelado = false;
    api
      .get<PaginatedResponse<Lote>>("/lotes", {
        params: { q: loteNumeroDebounced, limit: 8 },
      })
      .then((r) => {
        if (!cancelado) setSugerencias(r.data.data);
      })
      .catch(() => {
        if (!cancelado) setSugerencias([]);
      });
    return () => {
      cancelado = true;
    };
  }, [loteNumeroDebounced, lote?.numeroLote]);

  const seleccionarLoteSugerido = async (l: Lote) => {
    setLote(l);
    setLoteNumero(l.numeroLote);
    setLoteError(null);
    setMostrarSugerencias(false);
    setSugerencias([]);
    try {
      const insp = await api.get<PaginatedResponse<Inspeccion>>(
        "/inspecciones",
        { params: { loteId: l.id, limit: 100 } },
      );
      setInspeccionesPrev(insp.data.data);
    } catch (err) {
      setLoteError(handleApiError(err));
    }
  };

  const buscarLote = async () => {
    if (!loteNumero) return;
    setBuscandoLote(true);
    setLoteError(null);
    try {
      const r = await api.get<PaginatedResponse<Lote>>("/lotes", {
        params: { q: loteNumero, limit: 1 },
      });
      const found = r.data.data.find((l) => l.numeroLote === loteNumero);
      if (!found) {
        setLote(null);
        setLoteError(
          "Lote no encontrado. Créelo primero desde la sección de Lotes.",
        );
        return;
      }
      setLote(found);
      const insp = await api.get<PaginatedResponse<Inspeccion>>(
        "/inspecciones",
        { params: { loteId: found.id, limit: 100 } },
      );
      setInspeccionesPrev(insp.data.data);
    } catch (err) {
      setLoteError(handleApiError(err));
    } finally {
      setBuscandoLote(false);
    }
  };

  const cargarEquipos = async () => {
    try {
      const r = await api.get<PaginatedResponse<Equipo>>("/equipos", {
        params: { estado: "ACTIVO", limit: 100 },
      });
      const detalles = await Promise.all(
        r.data.data.map((e) =>
          api.get<Equipo>(`/equipos/${e.id}`).then((res) => res.data),
        ),
      );
      setEquipos(
        detalles.map((e) => ({ equipo: e, parametros: e.parametros ?? [] })),
      );
    } catch (err) {
      setEquipos([]);
      toast.error(handleApiError(err));
    }
  };

  const ultimaSecuencia = useMemo(() => {
    if (inspeccionesPrev.length === 0) return undefined;
    const ordenadas = [...inspeccionesPrev].sort((a, b) =>
      a.secuencia.localeCompare(b.secuencia),
    );
    return ordenadas[ordenadas.length - 1]?.secuencia;
  }, [inspeccionesPrev]);

  const siguienteSecuencia = nextSecuencia(ultimaSecuencia);

  const handleSubmit = async (guardarComoBorrador: boolean) => {
    if (!lote) {
      setLoteError("Debe seleccionar un lote");
      return;
    }
    const resultadosArr = Object.entries(resultados)
      .filter(([, v]) => v !== "")
      .map(([parametroId, valor]) => ({
        parametroId,
        valor: Number(valor),
      }));

    if (resultadosArr.length === 0) {
      toast.error("Debe capturar al menos un resultado");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editId) {
        await api.put(`/inspecciones/${editId}`, {
          fechaInspeccion: fecha,
          observaciones: observaciones || undefined,
          resultados: resultadosArr,
          guardarComoBorrador,
        });
        toast.success(
          guardarComoBorrador ? "Inspección actualizada" : "Inspección cerrada",
        );
      } else {
        await api.post(`/lotes/${lote.id}/inspecciones`, {
          fechaInspeccion: fecha,
          observaciones: observaciones || undefined,
          resultados: resultadosArr,
          guardarComoBorrador,
        });
        toast.success(
          guardarComoBorrador
            ? "Inspección guardada como borrador"
            : "Inspección cerrada",
        );
      }
      navigate("/inspecciones");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Inspecciones", to: "/inspecciones" },
          { label: isEdit ? "Editar" : "Nueva" },
        ]}
      />
      <PageHeader title={isEdit ? "Editar inspección" : "Registrar inspección"} />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Lote de producción
        </h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-md relative">
            <Label className="text-xs">Número de lote</Label>
            <Input
              value={loteNumero}
              onChange={(e) => {
                setLoteNumero(e.target.value);
                setMostrarSugerencias(true);
                if (lote && e.target.value !== lote.numeroLote) {
                  setLote(null);
                  setInspeccionesPrev([]);
                }
              }}
              onFocus={() => setMostrarSugerencias(true)}
              onBlur={() =>
                setTimeout(() => setMostrarSugerencias(false), 150)
              }
              placeholder="Ej. L-2026-0412"
              autoComplete="off"
            />
            {mostrarSugerencias && sugerencias.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-md">
                {sugerencias.map((l) => (
                  <li
                    key={String(l.id)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-secondary/50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void seleccionarLoteSugerido(l);
                    }}
                  >
                    <span className="font-mono">{l.numeroLote}</span>
                    {l.producto && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {l.producto.clave} — {l.producto.nombre}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            onClick={() => void buscarLote()}
            disabled={!loteNumero || buscandoLote}
          >
            Buscar
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => setCrearLoteOpen(true)}
          >
            Crear lote
          </Button>
        </div>
        {loteError && (
          <p className="text-xs text-state-danger">{loteError}</p>
        )}
        {lote && (
          <div className="text-sm p-3 rounded bg-secondary/30">
            <p>
              <strong>{lote.numeroLote}</strong>
            </p>
            {lote.producto && (
              <p className="text-xs text-muted-foreground">
                {lote.producto.clave} — {lote.producto.nombre}
              </p>
            )}
          </div>
        )}
      </section>

      {lote && (
        <>
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Asignación automática
            </h2>
            <div className="p-3 rounded border border-border bg-card text-sm">
              {ultimaSecuencia ? (
                <>
                  La última inspección fue{" "}
                  <span className="font-mono font-bold">{ultimaSecuencia}</span>
                  . La siguiente será{" "}
                  <span className="font-mono font-bold">
                    {siguienteSecuencia}
                  </span>{" "}
                  (análisis subsecuente).
                </>
              ) : (
                <>
                  Este lote no tiene inspecciones previas. La secuencia será{" "}
                  <span className="font-mono font-bold">A</span> (análisis
                  inicial).
                </>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Datos de la inspección
            </h2>
            <div className="max-w-xs">
              <Label className="text-xs">Fecha de inspección</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resultados
            </h2>
            {equipos.map(({ equipo, parametros }) => {
              const equipoId = String(equipo.id);
              const expandido = isEquipoExpandido(equipoId);
              const llenos = parametros.filter(
                (p) => (resultados[String(p.id)] ?? "") !== "",
              ).length;
              return (
              <div
                key={equipoId}
                className="rounded-md border border-border bg-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleEquipo(equipoId)}
                  className="w-full px-4 py-2 bg-secondary/30 text-sm font-medium flex items-center gap-2 hover:bg-secondary/50 transition-colors"
                  aria-expanded={expandido}
                >
                  {expandido ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span>
                    {equipo.clave} — {equipo.descripcionCorta}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {llenos}/{parametros.length} parámetros capturados
                  </span>
                </button>
                {expandido && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parámetro</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Rango internacional</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>
                        <span className="inline-flex items-center gap-1">
                          Estado (rango internacional)
                          <span
                            title="La evaluación contra los rangos personalizados del cliente se realiza al emitir el certificado, no en esta etapa."
                            className="inline-flex"
                          >
                            <Info
                              className="h-3.5 w-3.5 text-muted-foreground cursor-help"
                              aria-label="Información"
                            />
                          </span>
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parametros.map((p) => {
                      const valor = resultados[String(p.id)];
                      const valorNum = valor ? Number(valor) : NaN;
                      const dentro = !Number.isNaN(valorNum)
                        ? evaluarValor(
                            valorNum,
                            toNumber(p.limiteInferior),
                            toNumber(p.limiteSuperior),
                          )
                        : undefined;
                      return (
                        <TableRow key={String(p.id)}>
                          <TableCell>
                            <span className="font-mono">{p.clave}</span> —{" "}
                            {p.nombre}
                          </TableCell>
                          <TableCell>{p.unidadMedida}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            [{toNumber(p.limiteInferior)},{" "}
                            {toNumber(p.limiteSuperior)}]
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="any"
                              className="w-32"
                              value={valor ?? ""}
                              onChange={(e) =>
                                setResultados((prev) => ({
                                  ...prev,
                                  [String(p.id)]: e.target.value,
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {dentro === "OK" ? (
                              <StatusBadge status="ACTIVO" label="Dentro" />
                            ) : dentro === "FUERA" ? (
                              <StatusBadge status="BAJA" label="Fuera" />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                )}
              </div>
              );
            })}
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Observaciones
            </h2>
            <Textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Comentarios adicionales..."
            />
          </section>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => navigate("/inspecciones")}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void handleSubmit(true)}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar como borrador
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit(false)}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar y cerrar
            </Button>
          </div>
        </>
      )}

      <CrearLoteDialog
        open={crearLoteOpen}
        onOpenChange={setCrearLoteOpen}
        numeroLoteInicial={loteNumero}
        onCreated={(nuevo) => {
          setLote(nuevo);
          setLoteNumero(nuevo.numeroLote);
          setLoteError(null);
          setInspeccionesPrev([]);
        }}
      />
    </div>
  );
}
