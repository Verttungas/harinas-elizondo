import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api, handleApiError } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import { toNumber } from "@/lib/number";
import type { Inspeccion } from "@/types/domain.types";

export function InspeccionDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeEditar =
    usuario?.rol === "LABORATORIO" || usuario?.rol === "CONTROL_CALIDAD";

  const [cerrando, setCerrando] = useState(false);

  const { data, loading, error, refetch } = useQuery(
    () => api.get<Inspeccion>(`/inspecciones/${id}`).then((r) => r.data),
    [id],
  );

  const cerrar = async () => {
    if (!data) return;
    setCerrando(true);
    try {
      await api.post(`/inspecciones/${data.id}/cerrar`);
      toast.success("Inspección cerrada");
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setCerrando(false);
    }
  };

  if (loading) return <LoadingState rows={8} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const esBorrador = data.estado === "BORRADOR";

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Inspecciones", to: "/inspecciones" },
          { label: `Inspección ${data.secuencia}` },
        ]}
      />
      <PageHeader
        title={`Inspección ${data.secuencia}`}
        actions={
          puedeEditar && esBorrador ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/inspecciones/${data.id}/editar`)}
              >
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
              <Button onClick={() => void cerrar()} disabled={cerrando}>
                Cerrar inspección
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Lote</dt>
              <dd className="font-medium">
                {data.lote?.numeroLote ?? String(data.loteId)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Secuencia</dt>
              <dd>
                <span className="font-mono font-bold">{data.secuencia}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Fecha de inspección
              </dt>
              <dd>{formatFecha(data.fechaInspeccion)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Estado</dt>
              <dd>
                <StatusBadge status={data.estado} />
              </dd>
            </div>
            {data.observaciones && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Observaciones</dt>
                <dd>{data.observaciones}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {(data.resultados ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parámetro</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>En especificación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.resultados ?? []).map((r) => (
                  <TableRow key={String(r.id)}>
                    <TableCell>
                      <span className="font-mono">{r.parametro?.clave ?? "—"}</span>{" "}
                      — {r.parametro?.nombre ?? ""}
                    </TableCell>
                    <TableCell>{r.parametro?.unidadMedida ?? "—"}</TableCell>
                    <TableCell>{toNumber(r.valor)}</TableCell>
                    <TableCell>
                      {r.dentroEspecificacion ? (
                        <StatusBadge status="ACTIVO" label="Sí" />
                      ) : (
                        <StatusBadge status="BAJA" label="No" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
