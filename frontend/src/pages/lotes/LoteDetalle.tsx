import { useNavigate, useParams } from "react-router-dom";
import { FlaskConical, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import type { Lote } from "@/types/domain.types";

export function LoteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeOperar =
    usuario?.rol === "CONTROL_CALIDAD" || usuario?.rol === "LABORATORIO";

  const { data, loading, error, refetch } = useQuery(
    () => api.get<Lote>(`/lotes/${id}`).then((r) => r.data),
    [id],
  );

  if (loading) return <LoadingState rows={6} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb
        items={[
          { label: "Lotes", to: "/lotes" },
          { label: data.numeroLote },
        ]}
      />
      <PageHeader
        title={data.numeroLote}
        actions={
          puedeOperar && (
            <Button
              onClick={() =>
                navigate(`/inspecciones/nueva?loteId=${data.id}`)
              }
            >
              <FlaskConical className="h-4 w-4 mr-1" /> Registrar inspección
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del lote</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Número de lote</dt>
              <dd className="font-medium">{data.numeroLote}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Producto</dt>
              <dd>
                {data.producto
                  ? `${data.producto.clave} — ${data.producto.nombre}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Fecha de producción
              </dt>
              <dd>{formatFecha(data.fechaProduccion)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Cantidad producida
              </dt>
              <dd>
                {data.cantidadProducida
                  ? `${data.cantidadProducida} ${data.unidadCantidad ?? ""}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() =>
            navigate(`/inspecciones?loteId=${data.id}`)
          }
        >
          <Pencil className="h-4 w-4 mr-1" /> Ver inspecciones
        </Button>
      </div>
    </div>
  );
}
