import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import { rolesEscrituraInspecciones } from "@/lib/rbac";
import type { Inspeccion } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

export function InspeccionesListado() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeCrear =
    !!usuario?.rol && rolesEscrituraInspecciones.includes(usuario.rol);

  const [loteSearch, setLoteSearch] = useState("");
  const [estado, setEstado] = useState<"TODOS" | "BORRADOR" | "CERRADA">(
    "TODOS",
  );
  const [page, setPage] = useState(1);

  const { data: rawData, loading } = useQuery(
    () =>
      api
        .get<PaginatedResponse<Inspeccion>>("/inspecciones", {
          params: {
            page,
            limit: 20,
            estado,
          },
        })
        .then((r) => r.data),
    [estado, page],
  );

  const data =
    loteSearch && rawData
      ? {
          ...rawData,
          data: rawData.data.filter((i) =>
            i.lote?.numeroLote
              ?.toLowerCase()
              .includes(loteSearch.toLowerCase()),
          ),
        }
      : rawData;

  const columns: DataTableColumn<Inspeccion>[] = [
    {
      key: "lote",
      header: "Lote",
      render: (i) => i.lote?.numeroLote ?? "—",
    },
    {
      key: "secuencia",
      header: "Secuencia",
      render: (i) => <span className="font-mono">{i.secuencia}</span>,
    },
    {
      key: "fechaInspeccion",
      header: "Fecha",
      render: (i) => formatFecha(i.fechaInspeccion),
    },
    {
      key: "estado",
      header: "Estado",
      render: (i) => <StatusBadge status={i.estado} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (i) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/inspecciones/${i.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {puedeCrear && i.estado === "BORRADOR" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/inspecciones/${i.id}/editar`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspecciones"
        actions={
          puedeCrear && (
            <Button onClick={() => navigate("/inspecciones/nueva")}>
              <Plus className="h-4 w-4 mr-1" /> Nueva inspección
            </Button>
          )
        }
      />
      <FiltersBar>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Número de lote</Label>
          <Input
            value={loteSearch}
            onChange={(e) => {
              setLoteSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar..."
          />
        </div>
        <div className="min-w-[140px]">
          <Label className="text-xs">Estado</Label>
          <Select
            value={estado}
            onValueChange={(v) => {
              setEstado(v as typeof estado);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="BORRADOR">Borrador</SelectItem>
              <SelectItem value="CERRADA">Cerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FiltersBar>
      <DataTable<Inspeccion>
        columns={columns}
        data={data?.data ?? []}
        loading={loading}
        rowKey={(i) => String(i.id)}
        emptyMessage="No hay inspecciones con estos filtros"
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
