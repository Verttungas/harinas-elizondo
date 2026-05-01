import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Download, Send, GitFork } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EditarCertificadoDialog } from "@/components/certificados/EditarCertificadoDialog";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api, handleApiError } from "@/lib/api";
import { formatFecha, formatFechaHora } from "@/lib/format";
import type { Certificado, Inspeccion } from "@/types/domain.types";

export function CertificadoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeReenviar = usuario?.rol === "CONTROL_CALIDAD";
  const puedeEditar = usuario?.rol === "CONTROL_CALIDAD";

  const [inspeccionParaFicticia, setInspeccionParaFicticia] =
    useState<Inspeccion | null>(null);

  const { data, loading, error, refetch } = useQuery(
    () => api.get<Certificado>(`/certificados/${id}`).then((r) => r.data),
    [id],
  );

  const descargarPdf = async () => {
    if (!data) return;
    try {
      const r = await api.get(`/certificados/${data.id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.numero}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const reenviar = async () => {
    if (!data) return;
    try {
      await api.post(`/certificados/${data.id}/reenviar`);
      toast.success("Reenvío en proceso");
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  if (loading) return <LoadingState rows={8} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const tienePendientes = (data.envios ?? []).some(
    (e) => e.estado !== "ENVIADO",
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Certificados", to: "/certificados" },
          { label: data.numero },
        ]}
      />
      <PageHeader
        title={data.numero}
        description={`Emitido el ${formatFechaHora(data.fechaEmision)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void descargarPdf()}>
              <Download className="h-4 w-4 mr-1" /> Descargar PDF
            </Button>
            {puedeReenviar && tienePendientes && (
              <Button variant="outline" onClick={() => void reenviar()}>
                <Send className="h-4 w-4 mr-1" /> Reenviar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{data.cliente?.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {data.cliente?.claveSap} · {data.cliente?.rfc}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lote</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{data.lote?.numeroLote}</p>
            {data.lote?.producto && (
              <p className="text-xs text-muted-foreground">
                {data.lote.producto.clave} — {data.lote.producto.nombre}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Embarque</CardTitle>
          </CardHeader>
          <CardContent className="text-sm grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Orden de compra</p>
              <p>{data.numOrdenCompra}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Factura</p>
              <p>{data.numFactura}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solicitada</p>
              <p>{String(data.cantidadSolicitada)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entregada</p>
              <p>{String(data.cantidadEntrega)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha envío</p>
              <p>{formatFecha(data.fechaEnvio)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Caducidad</p>
              <p>{formatFecha(data.fechaCaducidad)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Inspecciones incluidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Si una inspección queda fuera de especificación, puedes derivar una
            ficticia ajustada — la original se preserva intacta.
          </p>
          {(data.certificadoInspeccion ?? []).map((ci) => (
            <div
              key={String(ci.inspeccion.id)}
              className="p-3 rounded border border-border flex items-center gap-3"
            >
              <span className="font-mono text-sm">{ci.inspeccion.secuencia}</span>
              <span className="text-sm flex-1">
                {formatFecha(ci.inspeccion.fechaInspeccion)}
              </span>
              <StatusBadge status={ci.inspeccion.estado} />
              {ci.inspeccion.esFicticia && (
                <StatusBadge status="BORRADOR" label="Ficticia" />
              )}
              {puedeEditar && !ci.inspeccion.esFicticia && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspeccionParaFicticia(ci.inspeccion)}
                >
                  <GitFork className="h-4 w-4 mr-1" />
                  Generar ficticia
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Envíos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.envios ?? []).map((e) => (
            <div
              key={String(e.id)}
              className="p-3 rounded border border-border flex items-center gap-3 text-sm"
            >
              <span className="text-xs text-muted-foreground w-24">
                {e.destinatarioTipo}
              </span>
              <span className="flex-1">{e.destinatarioCorreo}</span>
              <span className="text-xs text-muted-foreground">
                Intentos: {e.intentos}
              </span>
              <StatusBadge status={e.estado} />
            </div>
          ))}
          {(data.envios ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Sin envíos</p>
          )}
          {(data.envios ?? []).length > 0 && !tienePendientes && (
            <p className="text-xs text-muted-foreground">
              Todos los envíos fueron exitosos — no hay nada que reintentar.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="outline" onClick={() => navigate("/certificados")}>
          Volver al listado
        </Button>
      </div>

      {inspeccionParaFicticia && (
        <EditarCertificadoDialog
          open={!!inspeccionParaFicticia}
          onOpenChange={(o) => !o && setInspeccionParaFicticia(null)}
          inspeccionOrigen={inspeccionParaFicticia}
          onCreated={() => {
            setInspeccionParaFicticia(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}
