import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { api, handleApiError } from "@/lib/api";
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

export function Reportes() {
  const [filtros, setFiltros] = useState<ReportesFiltros>(defaultFiltros());
  const [tab, setTab] = useState<TipoExport>("parametros");

  const exportCsv = async () => {
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
          <Button variant="outline" onClick={() => void exportCsv()}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as TipoExport)}>
        <TabsList>
          <TabsTrigger value="parametros">Tendencia por parámetro</TabsTrigger>
          <TabsTrigger value="certificados-por-cliente">
            Certificados por cliente
          </TabsTrigger>
          <TabsTrigger value="desviaciones">Desviaciones por lote</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
