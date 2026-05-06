import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { api } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import { toNumber } from "@/lib/number";
import type { Equipo, Parametro } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";
import type { ReportesFiltros } from "../Reportes";

interface PuntoParametro {
  fecha: string;
  numeroLote: string;
  secuencia: string;
  valor: number;
  dentroEspecificacion: boolean;
}

interface ParametrosResponse {
  parametro: {
    id: string | number;
    clave: string;
    nombre: string;
    unidadMedida: string;
    limiteInferior: string | number;
    limiteSuperior: string | number;
  };
  puntos: PuntoParametro[];
}

interface Props {
  filtros: ReportesFiltros;
  setFiltros: (
    updater: (prev: ReportesFiltros) => ReportesFiltros,
  ) => void;
}

export function TabParametros({ filtros, setFiltros }: Props) {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [data, setData] = useState<ParametrosResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<PaginatedResponse<Equipo>>("/equipos", {
        params: { estado: "ACTIVO", limit: 100 },
      })
      .then(async (r) => {
        const detalles = await Promise.all(
          r.data.data.map((e) =>
            api.get<Equipo>(`/equipos/${e.id}`).then((res) => res.data),
          ),
        );
        const all: Parametro[] = [];
        for (const e of detalles) {
          for (const p of e.parametros ?? []) all.push(p);
        }
        setParametros(all);
      })
      .catch(() => setParametros([]));
  }, []);

  useEffect(() => {
    if (!filtros.parametroId) {
      setData(null);
      return;
    }
    setLoading(true);
    api
      .get<ParametrosResponse>("/reportes/parametros", {
        params: {
          parametroId: filtros.parametroId,
          desde: filtros.desde,
          hasta: filtros.hasta,
          clienteId: filtros.clienteId,
        },
      })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [filtros.parametroId, filtros.desde, filtros.hasta, filtros.clienteId]);

  const chartData =
    data?.puntos.map((p) => ({
      fecha: formatFecha(p.fecha),
      valor: p.valor,
    })) ?? [];

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Label className="text-xs">Parámetro</Label>
        <Select
          value={filtros.parametroId ?? ""}
          onValueChange={(v) =>
            setFiltros((f) => ({ ...f, parametroId: v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione parámetro..." />
          </SelectTrigger>
          <SelectContent>
            {parametros.map((p) => (
              <SelectItem key={String(p.id)} value={String(p.id)}>
                {p.clave} — {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!filtros.parametroId ? (
        <EmptyState
          title="Seleccione un parámetro"
          description="Para ver la gráfica de tendencia."
        />
      ) : loading ? (
        <LoadingState />
      ) : !data || data.puntos.length === 0 ? (
        <EmptyState description="Sin datos para el rango seleccionado." />
      ) : (
        <>
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-sm font-medium mb-2">
              {data.parametro.clave} — {data.parametro.nombre} (
              {data.parametro.unidadMedida})
            </p>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine
                    y={toNumber(data.parametro.limiteInferior)}
                    stroke="var(--state-danger, #dc2626)"
                    strokeDasharray="3 3"
                    label="Lím. inf."
                  />
                  <ReferenceLine
                    y={toNumber(data.parametro.limiteSuperior)}
                    stroke="var(--state-danger, #dc2626)"
                    strokeDasharray="3 3"
                    label="Lím. sup."
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Secuencia</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>En espec.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.puntos.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatFecha(p.fecha)}</TableCell>
                    <TableCell>{p.numeroLote}</TableCell>
                    <TableCell className="font-mono">{p.secuencia}</TableCell>
                    <TableCell>{p.valor}</TableCell>
                    <TableCell>
                      {p.dentroEspecificacion ? "Sí" : "No"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
