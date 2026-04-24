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
import type { ReportesFiltros } from "../Reportes";

interface Row {
  clienteId: string | number;
  claveSap: string;
  clienteNombre: string;
  totalCertificados: number;
}

export function TabCertificadosPorCliente({
  filtros,
}: {
  filtros: ReportesFiltros;
}) {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<Row[]>("/reportes/certificados-por-cliente", {
        params: { desde: filtros.desde, hasta: filtros.hasta },
      })
      .then((r) => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [filtros.desde, filtros.hasta]);

  if (loading) return <LoadingState />;
  if (data.length === 0)
    return <EmptyState description="Sin datos para el rango seleccionado." />;

  const chartData = data.slice(0, 10).map((d) => ({
    cliente: d.claveSap || d.clienteNombre.slice(0, 12),
    total: d.totalCertificados,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-4">
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cliente" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clave SAP</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Total certificados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={String(r.clienteId)}>
                <TableCell className="font-mono">{r.claveSap}</TableCell>
                <TableCell>{r.clienteNombre}</TableCell>
                <TableCell className="text-right">
                  {r.totalCertificados}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
