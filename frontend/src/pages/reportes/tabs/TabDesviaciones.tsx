import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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
import type { Producto } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";
import type { ReportesFiltros } from "../Reportes";

interface Row {
  loteId: string | number;
  numeroLote: string;
  productoClave: string;
  productoNombre: string;
  total: number;
  fuera: number;
  porcentajeFuera: number;
}

interface Props {
  filtros: ReportesFiltros;
  setFiltros: (
    updater: (prev: ReportesFiltros) => ReportesFiltros,
  ) => void;
}

export function TabDesviaciones({ filtros, setFiltros }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<PaginatedResponse<Producto>>("/productos", {
        params: { limit: 100 },
      })
      .then((r) => setProductos(r.data.data))
      .catch(() => setProductos([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get<Row[]>("/reportes/desviaciones", {
        params: {
          desde: filtros.desde,
          hasta: filtros.hasta,
          productoId: filtros.productoId,
        },
      })
      .then((r) => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [filtros.desde, filtros.hasta, filtros.productoId]);

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Label className="text-xs">Producto (opcional)</Label>
        <Select
          value={filtros.productoId ?? ""}
          onValueChange={(v) =>
            setFiltros((f) => ({ ...f, productoId: v || undefined }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos los productos" />
          </SelectTrigger>
          <SelectContent>
            {productos.map((p) => (
              <SelectItem key={String(p.id)} value={String(p.id)}>
                {p.clave} — {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState />
      ) : data.length === 0 ? (
        <EmptyState description="Sin desviaciones para el rango seleccionado." />
      ) : (
        <>
          <div className="rounded-md border border-border bg-card p-4">
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="numeroLote" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="porcentajeFuera" fill="#dc2626" name="% fuera" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fuera</TableHead>
                  <TableHead>% fuera</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={String(r.loteId)}>
                    <TableCell>{r.numeroLote}</TableCell>
                    <TableCell>
                      {r.productoClave} — {r.productoNombre}
                    </TableCell>
                    <TableCell>{r.total}</TableCell>
                    <TableCell>{r.fuera}</TableCell>
                    <TableCell>{r.porcentajeFuera}%</TableCell>
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
