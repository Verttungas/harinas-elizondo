import { useState, useEffect } from "react";
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
import type { Inspeccion } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";
import type { ReportesFiltros } from "../Reportes";

export function TabFicticias({ filtros }: { filtros: ReportesFiltros }) {
  const [data, setData] = useState<Inspeccion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Inspeccion>>("/reportes/ficticias", {
        params: {
          desde: filtros.desde,
          hasta: filtros.hasta,
          page: 1,
          limit: 50,
        },
      })
      .then((r) => setData(r.data.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [filtros.desde, filtros.hasta]);

  if (loading) return <LoadingState />;
  if (data.length === 0)
    return (
      <EmptyState description="No hay inspecciones ficticias en el rango." />
    );

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead>Secuencia</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Justificación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((i) => (
            <TableRow key={String(i.id)}>
              <TableCell>{formatFecha(i.fechaInspeccion)}</TableCell>
              <TableCell>{i.lote?.numeroLote ?? "—"}</TableCell>
              <TableCell className="font-mono">{i.secuencia}</TableCell>
              <TableCell className="font-mono">
                {i.inspeccionOrigen?.secuencia ?? "—"}
              </TableCell>
              <TableCell className="text-xs max-w-md truncate">
                {i.justificacionAjuste ?? ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
