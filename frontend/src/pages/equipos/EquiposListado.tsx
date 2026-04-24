import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Eye, Pencil, PowerOff, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MotivoDialog } from "@/components/shared/MotivoDialog";
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
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { api, handleApiError } from "@/lib/api";
import type { Equipo, EstadoActivo } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

type EstadoFiltro = EstadoActivo | "TODOS";

export function EquiposListado() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol === "CONTROL_CALIDAD";

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("ACTIVO");
  const [marca, setMarca] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 400);
  const debouncedMarca = useDebounce(marca, 400);

  const [motivoDialog, setMotivoDialog] = useState<
    | { tipo: "inactivar" | "baja"; equipo: Equipo }
    | null
  >(null);
  const [accionLoading, setAccionLoading] = useState(false);

  const { data, loading, refetch } = useQuery(
    () =>
      api
        .get<PaginatedResponse<Equipo>>("/equipos", {
          params: {
            page,
            limit: 20,
            estado,
            ...(debouncedQ ? { q: debouncedQ } : {}),
            ...(debouncedMarca ? { marca: debouncedMarca } : {}),
          },
        })
        .then((r) => r.data),
    [debouncedQ, debouncedMarca, estado, page],
  );

  const handleInactivar = async (motivo: string) => {
    if (!motivoDialog) return;
    setAccionLoading(true);
    try {
      const url =
        motivoDialog.tipo === "inactivar"
          ? `/equipos/${motivoDialog.equipo.id}/inactivar`
          : `/equipos/${motivoDialog.equipo.id}/baja`;
      await api.post(url, { motivo });
      toast.success(
        motivoDialog.tipo === "inactivar"
          ? "Equipo inactivado"
          : "Equipo dado de baja",
      );
      setMotivoDialog(null);
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setAccionLoading(false);
    }
  };

  const columns: DataTableColumn<Equipo>[] = [
    { key: "clave", header: "Clave" },
    { key: "descripcionCorta", header: "Descripción" },
    { key: "marca", header: "Marca", render: (e) => e.marca ?? "—" },
    { key: "modelo", header: "Modelo", render: (e) => e.modelo ?? "—" },
    { key: "ubicacion", header: "Ubicación", render: (e) => e.ubicacion ?? "—" },
    {
      key: "estado",
      header: "Estado",
      render: (e) => <StatusBadge status={e.estado} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (e) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/equipos/${e.id}`)}
            title="Ver"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {puedeEditar && e.estado === "ACTIVO" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/equipos/${e.id}/editar`)}
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMotivoDialog({ tipo: "inactivar", equipo: e })}
                title="Inactivar"
              >
                <PowerOff className="h-4 w-4" />
              </Button>
            </>
          )}
          {puedeEditar && e.estado === "INACTIVO" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMotivoDialog({ tipo: "baja", equipo: e })}
              title="Dar de baja"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipos de laboratorio"
        description="Gestión del inventario de equipos y sus parámetros"
        actions={
          puedeEditar && (
            <Button onClick={() => navigate("/equipos/nuevo")}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo equipo
            </Button>
          )
        }
      />

      <FiltersBar>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Búsqueda</Label>
          <Input
            placeholder="Clave o descripción..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="min-w-[140px]">
          <Label className="text-xs">Estado</Label>
          <Select
            value={estado}
            onValueChange={(v) => {
              setEstado(v as EstadoFiltro);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVO">Activos</SelectItem>
              <SelectItem value="INACTIVO">Inactivos</SelectItem>
              <SelectItem value="BAJA">Baja</SelectItem>
              <SelectItem value="TODOS">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <Label className="text-xs">Marca</Label>
          <Input
            value={marca}
            onChange={(e) => {
              setMarca(e.target.value);
              setPage(1);
            }}
            placeholder="Filtrar por marca"
          />
        </div>
      </FiltersBar>

      <DataTable<Equipo>
        columns={columns}
        data={data?.data ?? []}
        loading={loading}
        rowKey={(e) => String(e.id)}
        emptyMessage="No hay equipos registrados con estos filtros"
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

      {motivoDialog && (
        <MotivoDialog
          open={!!motivoDialog}
          onOpenChange={(o) => !o && setMotivoDialog(null)}
          title={
            motivoDialog.tipo === "inactivar"
              ? "Inactivar equipo"
              : "Dar de baja equipo"
          }
          description={`Equipo: ${motivoDialog.equipo.clave} — ${motivoDialog.equipo.descripcionCorta}`}
          confirmLabel={
            motivoDialog.tipo === "inactivar" ? "Inactivar" : "Dar de baja"
          }
          destructive={motivoDialog.tipo === "baja"}
          loading={accionLoading}
          onConfirm={handleInactivar}
        />
      )}
    </div>
  );
}
