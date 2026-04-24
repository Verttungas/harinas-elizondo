import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Eye, Pencil, PowerOff, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MotivoDialog } from "@/components/shared/MotivoDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
import type { Cliente } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

type EstadoFiltro = "ACTIVO" | "INACTIVO" | "TODOS";
type ReqCertFiltro = "TODOS" | "SI" | "NO";

export function ClientesListado() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol === "CONTROL_CALIDAD";

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("ACTIVO");
  const [reqCert, setReqCert] = useState<ReqCertFiltro>("TODOS");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 400);

  const [motivoDialog, setMotivoDialog] = useState<Cliente | null>(null);
  const [reactivar, setReactivar] = useState<Cliente | null>(null);
  const [accionLoading, setAccionLoading] = useState(false);

  const { data, loading, refetch } = useQuery(
    () =>
      api
        .get<PaginatedResponse<Cliente>>("/clientes", {
          params: {
            page,
            limit: 20,
            estado,
            ...(debouncedQ ? { q: debouncedQ } : {}),
            ...(reqCert !== "TODOS"
              ? { requiereCertificado: reqCert === "SI" }
              : {}),
          },
        })
        .then((r) => r.data),
    [debouncedQ, estado, reqCert, page],
  );

  const handleInactivar = async (motivo: string) => {
    if (!motivoDialog) return;
    setAccionLoading(true);
    try {
      await api.post(`/clientes/${motivoDialog.id}/inactivar`, { motivo });
      toast.success("Cliente inactivado");
      setMotivoDialog(null);
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setAccionLoading(false);
    }
  };

  const handleReactivar = async () => {
    if (!reactivar) return;
    setAccionLoading(true);
    try {
      await api.post(`/clientes/${reactivar.id}/reactivar`);
      toast.success("Cliente reactivado");
      setReactivar(null);
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setAccionLoading(false);
    }
  };

  const columns: DataTableColumn<Cliente>[] = [
    { key: "claveSap", header: "Clave SAP" },
    { key: "nombre", header: "Nombre" },
    { key: "rfc", header: "RFC" },
    {
      key: "contacto",
      header: "Contacto",
      render: (c) => c.contactoNombre ?? "—",
    },
    {
      key: "requiereCertificado",
      header: "Req. cert.",
      render: (c) => (c.requiereCertificado ? "Sí" : "No"),
    },
    {
      key: "estado",
      header: "Estado",
      render: (c) => <StatusBadge status={c.estado} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/clientes/${c.id}`)}
            title="Ver"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {puedeEditar && c.estado === "ACTIVO" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/clientes/${c.id}/editar`)}
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMotivoDialog(c)}
                title="Inactivar"
              >
                <PowerOff className="h-4 w-4" />
              </Button>
            </>
          )}
          {puedeEditar && c.estado === "INACTIVO" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReactivar(c)}
              title="Reactivar"
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
        title="Clientes"
        description="Catálogo de clientes y valores de referencia particulares"
        actions={
          puedeEditar && (
            <Button onClick={() => navigate("/clientes/nuevo")}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo cliente
            </Button>
          )
        }
      />

      <FiltersBar>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Búsqueda</Label>
          <Input
            placeholder="Clave SAP, nombre, RFC..."
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
              <SelectItem value="TODOS">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <Label className="text-xs">Requiere certificado</Label>
          <Select
            value={reqCert}
            onValueChange={(v) => {
              setReqCert(v as ReqCertFiltro);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="SI">Sí</SelectItem>
              <SelectItem value="NO">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FiltersBar>

      <DataTable<Cliente>
        columns={columns}
        data={data?.data ?? []}
        loading={loading}
        rowKey={(c) => String(c.id)}
        emptyMessage="No hay clientes con estos filtros"
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
          title="Inactivar cliente"
          description={`Cliente: ${motivoDialog.claveSap} — ${motivoDialog.nombre}`}
          confirmLabel="Inactivar"
          loading={accionLoading}
          onConfirm={handleInactivar}
        />
      )}

      {reactivar && (
        <ConfirmDialog
          open={!!reactivar}
          onOpenChange={(o) => !o && setReactivar(null)}
          title="Reactivar cliente"
          description={`¿Reactivar a ${reactivar.nombre}?`}
          confirmLabel="Reactivar"
          loading={accionLoading}
          onConfirm={handleReactivar}
        />
      )}
    </div>
  );
}
