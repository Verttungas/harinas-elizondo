import { useNavigate, useParams } from "react-router-dom";
import { FlaskConical, FileText, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatFecha, formatNumero } from "@/lib/format";
import { rolesEscrituraInspecciones } from "@/lib/rbac";
import type {
  Certificado,
  Inspeccion,
  Lote,
  SaldoLote,
} from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

export function LoteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeRegistrarInspeccion =
    !!usuario?.rol && rolesEscrituraInspecciones.includes(usuario.rol);

  const lote = useQuery(
    () => api.get<Lote>(`/lotes/${id}`).then((r) => r.data),
    [id],
  );

  const inspecciones = useQuery(
    () =>
      api
        .get<PaginatedResponse<Inspeccion>>("/inspecciones", {
          params: { loteId: id, limit: 100, page: 1 },
        })
        .then((r) => r.data),
    [id],
  );

  const certificados = useQuery(
    () =>
      api
        .get<PaginatedResponse<Certificado>>("/certificados", {
          params: { loteId: id, limit: 100, page: 1 },
        })
        .then((r) => r.data),
    [id],
  );

  const saldo = useQuery(
    () => api.get<SaldoLote>(`/lotes/${id}/saldo`).then((r) => r.data),
    [id],
  );

  if (lote.loading) return <LoadingState rows={6} />;
  if (lote.error)
    return <ErrorState message={lote.error} onRetry={lote.refetch} />;
  if (!lote.data) return null;

  const data = lote.data;
  const inspeccionesOrdenadas = [...(inspecciones.data?.data ?? [])].sort(
    (a, b) => a.secuencia.localeCompare(b.secuencia),
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb
        items={[
          { label: "Lotes", to: "/lotes" },
          { label: data.numeroLote },
        ]}
      />
      <PageHeader
        title={data.numeroLote}
        actions={
          puedeRegistrarInspeccion && (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventario del lote</CardTitle>
        </CardHeader>
        <CardContent>
          {saldo.loading ? (
            <p className="text-sm text-muted-foreground">Cargando saldo…</p>
          ) : saldo.data ? (
            <dl className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Producida</dt>
                <dd>
                  {saldo.data.producida !== null
                    ? `${formatNumero(Number(saldo.data.producida), 2)} ${saldo.data.unidadCantidad ?? ""}`
                    : "No registrada"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Entregada</dt>
                <dd>
                  {formatNumero(Number(saldo.data.entregada), 2)}{" "}
                  {saldo.data.unidadCantidad ?? ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Disponible</dt>
                <dd className="font-semibold">
                  {saldo.data.disponible !== null
                    ? `${formatNumero(Number(saldo.data.disponible), 2)} ${saldo.data.unidadCantidad ?? ""}`
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No se pudo calcular el saldo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Inspecciones (secuencia A–Z)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inspecciones.loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : inspeccionesOrdenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay inspecciones registradas para este lote.
            </p>
          ) : (
            <ol className="space-y-2">
              {inspeccionesOrdenadas.map((insp) => (
                <li
                  key={String(insp.id)}
                  className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-secondary/30"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-brand-accent-foreground font-mono text-sm font-semibold">
                    {insp.secuencia}
                  </span>
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatFecha(insp.fechaInspeccion)}
                      </span>
                      <StatusBadge status={insp.estado} />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/inspecciones/${insp.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificados emitidos</CardTitle>
        </CardHeader>
        <CardContent>
          {certificados.loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (certificados.data?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No se han emitido certificados sobre este lote.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(certificados.data?.data ?? []).map((cert) => (
                <li
                  key={String(cert.id)}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-secondary/30 rounded-md px-2"
                  onClick={() => navigate(`/certificados/${cert.id}`)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{cert.numero}</span>
                  <span className="flex-1 text-sm truncate">
                    {cert.cliente?.nombre ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFecha(cert.fechaEmision)}
                  </span>
                  <StatusBadge status={cert.estado} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
