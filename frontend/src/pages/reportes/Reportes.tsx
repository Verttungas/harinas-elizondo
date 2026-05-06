import { useState } from "react";
import { toast } from "sonner";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api, handleApiError } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api.types";
import { TabParametros } from "./tabs/TabParametros";
import { TabCertificadosPorCliente } from "./tabs/TabCertificadosPorCliente";
import { TabDesviaciones } from "./tabs/TabDesviaciones";

export type ReportesFiltros = {
  desde: string;
  hasta: string;
  clienteId?: string;
  productoId?: string;
  parametroId?: string;
};

function defaultFiltros(): ReportesFiltros {
  const now = new Date();
  const hace30 = new Date(now);
  hace30.setDate(now.getDate() - 30);
  return {
    desde: hace30.toISOString().slice(0, 10),
    hasta: now.toISOString().slice(0, 10),
  };
}

type TipoExport =
  | "parametros"
  | "certificados-por-cliente"
  | "desviaciones";

type TabReporte = TipoExport | "guardados";

interface ReporteGuardado {
  id: string | number;
  nombre: string;
  descripcion?: string | null;
  tipo: TipoExport;
  filtros: Record<string, unknown>;
  activo: boolean;
}

const tiposReporte: Array<{ value: TipoExport; label: string }> = [
  { value: "parametros", label: "Tendencia por parámetros" },
  { value: "certificados-por-cliente", label: "Certificados por cliente" },
  { value: "desviaciones", label: "Desviaciones por lote" },
];

const tipoLabel = new Map(tiposReporte.map((tipo) => [tipo.value, tipo.label]));

export function Reportes() {
  const { usuario } = useAuth();
  const [filtros, setFiltros] = useState<ReportesFiltros>(defaultFiltros());
  const [tab, setTab] = useState<TabReporte>("parametros");
  const esAdministrador = usuario?.rol === "ADMINISTRADOR";

  const exportCsv = async () => {
    if (tab === "guardados") return;
    try {
      const r = await api.get("/reportes/export", {
        params: {
          tipo: tab,
          formato: "csv",
          desde: filtros.desde,
          hasta: filtros.hasta,
          clienteId: filtros.clienteId,
          productoId: filtros.productoId,
          parametroId: filtros.parametroId,
        },
        responseType: "blob",
      });
      const blob = new Blob([r.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${tab}-${filtros.desde}-${filtros.hasta}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Indicadores de calidad y productividad"
        actions={
          tab !== "guardados" && (
          <Button variant="outline" onClick={() => void exportCsv()}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
          )
        }
      />

      <FiltersBar>
        <div className="min-w-[140px]">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={filtros.desde}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, desde: e.target.value }))
            }
          />
        </div>
        <div className="min-w-[140px]">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={filtros.hasta}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, hasta: e.target.value }))
            }
          />
        </div>
      </FiltersBar>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabReporte)}>
        <TabsList>
          <TabsTrigger value="parametros">Tendencia por parámetro</TabsTrigger>
          <TabsTrigger value="certificados-por-cliente">
            Certificados por cliente
          </TabsTrigger>
          <TabsTrigger value="desviaciones">Desviaciones por lote</TabsTrigger>
          {esAdministrador && (
            <TabsTrigger value="guardados">Reportes guardados</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="parametros" className="pt-4">
          <TabParametros filtros={filtros} setFiltros={setFiltros} />
        </TabsContent>
        <TabsContent value="certificados-por-cliente" className="pt-4">
          <TabCertificadosPorCliente filtros={filtros} />
        </TabsContent>
        <TabsContent value="desviaciones" className="pt-4">
          <TabDesviaciones filtros={filtros} setFiltros={setFiltros} />
        </TabsContent>
        {esAdministrador && (
          <TabsContent value="guardados" className="pt-4">
            <ReportesGuardados filtros={filtros} tabActual={tab} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ReportesGuardados({
  filtros,
  tabActual,
}: {
  filtros: ReportesFiltros;
  tabActual: TabReporte;
}) {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reporteEliminar, setReporteEliminar] = useState<ReporteGuardado | null>(
    null,
  );
  const [form, setForm] = useState({
    id: undefined as string | number | undefined,
    nombre: "",
    descripcion: "",
    tipo:
      tabActual === "guardados" ? "parametros" : (tabActual as TipoExport),
    filtros: JSON.stringify(filtros, null, 2),
  });

  const { data, loading, refetch } = useQuery(
    () =>
      api
        .get<PaginatedResponse<ReporteGuardado>>("/reportes/guardados", {
          params: { page, limit: 20, estado: "ACTIVO" },
        })
        .then((r) => r.data),
    [page],
  );

  const openCreate = () => {
    setForm({
      id: undefined,
      nombre: "",
      descripcion: "",
      tipo:
        tabActual === "guardados" ? "parametros" : (tabActual as TipoExport),
      filtros: JSON.stringify(filtros, null, 2),
    });
    setFormOpen(true);
  };

  const openEdit = (reporte: ReporteGuardado) => {
    setForm({
      id: reporte.id,
      nombre: reporte.nombre,
      descripcion: reporte.descripcion ?? "",
      tipo: reporte.tipo,
      filtros: JSON.stringify(reporte.filtros ?? {}, null, 2),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        tipo: form.tipo,
        filtros: JSON.parse(form.filtros) as Record<string, unknown>,
      };
      if (form.id) {
        await api.put(`/reportes/guardados/${form.id}`, payload);
        toast.success("Reporte actualizado");
      } else {
        await api.post("/reportes/guardados", payload);
        toast.success("Reporte creado");
      }
      setFormOpen(false);
      void refetch();
    } catch (err) {
      toast.error(err instanceof SyntaxError ? "Filtros JSON inválidos" : handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reporteEliminar) return;
    try {
      await api.delete(`/reportes/guardados/${reporteEliminar.id}`);
      toast.success("Reporte eliminado");
      setReporteEliminar(null);
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const columns: DataTableColumn<ReporteGuardado>[] = [
    { key: "nombre", header: "Nombre" },
    {
      key: "tipo",
      header: "Tipo",
      render: (r) => tipoLabel.get(r.tipo) ?? r.tipo,
    },
    {
      key: "estado",
      header: "Estado",
      render: (r) => (
        <Badge variant={r.activo ? "default" : "secondary"}>
          {r.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setReporteEliminar(r)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo reporte
        </Button>
      </div>
      <DataTable<ReporteGuardado>
        columns={columns}
        data={data?.data ?? []}
        loading={loading}
        rowKey={(r) => String(r.id)}
        emptyMessage="No hay reportes guardados"
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar reporte" : "Nuevo reporte"}
            </DialogTitle>
            <DialogDescription>
              Guarda una configuración reutilizable de reporte.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Input
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tipo: v as TipoExport }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposReporte.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Filtros JSON</Label>
              <Textarea
                value={form.filtros}
                rows={6}
                onChange={(e) =>
                  setForm((f) => ({ ...f, filtros: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.nombre}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reporteEliminar && (
        <ConfirmDialog
          open={!!reporteEliminar}
          onOpenChange={(open) => !open && setReporteEliminar(null)}
          title="Eliminar reporte"
          description={`El reporte ${reporteEliminar.nombre} quedará inactivo.`}
          confirmLabel="Eliminar"
          destructive
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
