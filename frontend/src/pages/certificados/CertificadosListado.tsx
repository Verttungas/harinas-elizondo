import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Eye, Download, Send } from "lucide-react";
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
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { api, handleApiError } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import type { Certificado, EstadoCertificado } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

type EstadoFiltro = EstadoCertificado | "TODOS";

export function CertificadosListado() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeEmitir = usuario?.rol === "CONTROL_CALIDAD";

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("TODOS");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 400);

  const { data, loading, refetch } = useQuery(
    () =>
      api
        .get<PaginatedResponse<Certificado>>("/certificados", {
          params: {
            page,
            limit: 20,
            estado,
            ...(debouncedQ ? { q: debouncedQ } : {}),
            ...(desde ? { desde } : {}),
            ...(hasta ? { hasta } : {}),
          },
        })
        .then((r) => r.data),
    [debouncedQ, estado, desde, hasta, page],
  );

  const descargarPdf = async (cert: Certificado) => {
    try {
      const r = await api.get(`/certificados/${cert.id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cert.numero}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const reenviar = async (cert: Certificado) => {
    try {
      await api.post(`/certificados/${cert.id}/reenviar`);
      toast.success("Reenvío en proceso");
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const columns: DataTableColumn<Certificado>[] = [
    {
      key: "numero",
      header: "Número",
      render: (c) => <span className="font-mono">{c.numero}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      render: (c) => c.cliente?.nombre ?? "—",
    },
    {
      key: "lote",
      header: "Lote",
      render: (c) => c.lote?.numeroLote ?? "—",
    },
    {
      key: "fechaEmision",
      header: "Fecha emisión",
      render: (c) => formatFecha(c.fechaEmision),
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
            title="Ver"
            onClick={() => navigate(`/certificados/${c.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Descargar PDF"
            onClick={() => void descargarPdf(c)}
          >
            <Download className="h-4 w-4" />
          </Button>
          {puedeEmitir && c.estado !== "ENVIADO" && (
            <Button
              variant="ghost"
              size="sm"
              title="Reenviar"
              onClick={() => void reenviar(c)}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificados"
        actions={
          puedeEmitir && (
            <Button onClick={() => navigate("/certificados/nuevo")}>
              <Plus className="h-4 w-4 mr-1" /> Emitir certificado
            </Button>
          )
        }
      />
      <FiltersBar>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Número</Label>
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="CERT-AAAA-NNNNNN"
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
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="EMITIDO">Emitido</SelectItem>
              <SelectItem value="ENVIO_PARCIAL">Envío parcial</SelectItem>
              <SelectItem value="ENVIADO">Enviado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[140px]">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="min-w-[140px]">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </FiltersBar>
      <DataTable<Certificado>
        columns={columns}
        data={data?.data ?? []}
        loading={loading}
        rowKey={(c) => String(c.id)}
        emptyMessage="No hay certificados emitidos con estos filtros"
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
