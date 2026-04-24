import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@/hooks/useApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import type { Lote } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

export function LotesListado() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeCrear =
    usuario?.rol === "CONTROL_CALIDAD" || usuario?.rol === "LABORATORIO";

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 400);

  const { data, loading } = useQuery(
    () =>
      api
        .get<PaginatedResponse<Lote>>("/lotes", {
          params: {
            page,
            limit: 20,
            ...(debouncedQ ? { q: debouncedQ } : {}),
          },
        })
        .then((r) => r.data),
    [debouncedQ, page],
  );

  const columns: DataTableColumn<Lote>[] = [
    { key: "numeroLote", header: "Número de lote" },
    {
      key: "producto",
      header: "Producto",
      render: (l) =>
        l.producto ? `${l.producto.clave} — ${l.producto.nombre}` : "—",
    },
    {
      key: "fechaProduccion",
      header: "Fecha de producción",
      render: (l) => formatFecha(l.fechaProduccion),
    },
    {
      key: "cantidad",
      header: "Cantidad",
      render: (l) =>
        l.cantidadProducida
          ? `${l.cantidadProducida} ${l.unidadCantidad ?? ""}`
          : "—",
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (l) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/lotes/${l.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {puedeCrear && (
            <Button
              variant="ghost"
              size="sm"
              title="Registrar inspección"
              onClick={() => navigate(`/inspecciones/nueva?loteId=${l.id}`)}
            >
              <FlaskConical className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lotes de producción"
        actions={
          puedeCrear && (
            <Button onClick={() => navigate("/lotes/nuevo")}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo lote
            </Button>
          )
        }
      />
      <FiltersBar>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Número de lote</Label>
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar..."
          />
        </div>
      </FiltersBar>
      <DataTable<Lote>
        columns={columns}
        data={data?.data ?? []}
        loading={loading}
        rowKey={(l) => String(l.id)}
        emptyMessage="No hay lotes registrados"
        pagination={
          data?.pagination
            ? {
                page: data.pagination.page,
                limit: data.pagination.limit,
                total: data.pagination.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
