import { useNavigate } from "react-router-dom";
import { PlusCircle, FileCheck, UserPlus, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatFecha, formatNumero } from "@/lib/format";
import type {
  Certificado,
  ResumenReporte,
} from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

export function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const resumen = useQuery(
    () => api.get<ResumenReporte>("/reportes/resumen").then((r) => r.data),
    [],
  );

  const ultimos = useQuery(
    () =>
      api
        .get<PaginatedResponse<Certificado>>("/certificados", {
          params: { limit: 5, page: 1 },
        })
        .then((r) => r.data),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={usuario ? `Bienvenido, ${usuario.nombre}` : "Bienvenido"}
      />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Indicadores del mes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Certificados emitidos"
            valor={resumen.data?.certificadosEmitidos.valor}
            variacion={resumen.data?.certificadosEmitidos.variacionMesAnterior}
            variacionSufijo="vs. mes anterior"
            loading={resumen.loading}
          />
          <KpiCard
            title="Lotes en especificación"
            valor={
              resumen.data?.lotesEnEspecificacion.valor !== undefined
                ? `${formatNumero(resumen.data.lotesEnEspecificacion.valor, 1)}%`
                : undefined
            }
            variacion={resumen.data?.lotesEnEspecificacion.variacionPuntos}
            variacionSufijo="pts"
            loading={resumen.loading}
          />
          <KpiCard
            title="Clientes activos"
            valor={resumen.data?.clientesActivos.valor}
            loading={resumen.loading}
          />
          <KpiCard
            title="Inspecciones ficticias"
            valor={resumen.data?.inspeccionesFicticias.valor}
            loading={resumen.loading}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Acciones rápidas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            className="h-auto justify-start gap-2 p-4"
            onClick={() => navigate("/inspecciones/nueva")}
          >
            <PlusCircle className="h-4 w-4" />
            Registrar inspección
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-2 p-4"
            onClick={() => navigate("/certificados/nuevo")}
          >
            <FileCheck className="h-4 w-4" />
            Emitir certificado
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-2 p-4"
            onClick={() => navigate("/clientes/nuevo")}
          >
            <UserPlus className="h-4 w-4" />
            Nuevo cliente
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-2 p-4"
            onClick={() => navigate("/lotes/nuevo")}
          >
            <Package className="h-4 w-4" />
            Registrar lote
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Últimos certificados
        </h2>
        <Card>
          <CardContent className="p-0">
            {ultimos.loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (ultimos.data?.data ?? []).length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">
                Aún no hay certificados emitidos.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {(ultimos.data?.data ?? []).map((cert) => (
                  <li
                    key={String(cert.id)}
                    className="p-3 flex items-center gap-3 hover:bg-secondary/30 cursor-pointer"
                    onClick={() => navigate(`/certificados/${cert.id}`)}
                  >
                    <span className="font-mono text-sm">{cert.numero}</span>
                    <span className="flex-1 text-sm truncate">
                      {cert.cliente?.nombre ?? ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Lote {cert.lote?.numeroLote ?? ""}
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
      </section>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  valor?: number | string;
  variacion?: number;
  variacionSufijo?: string;
  loading?: boolean;
}

function KpiCard({
  title,
  valor,
  variacion,
  variacionSufijo,
  loading,
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-2xl font-bold">
            {typeof valor === "number" ? formatNumero(valor, 0) : (valor ?? "—")}
          </p>
        )}
        {variacion !== undefined && !loading && (
          <p
            className={
              variacion > 0
                ? "text-xs text-state-success"
                : variacion < 0
                  ? "text-xs text-state-danger"
                  : "text-xs text-muted-foreground"
            }
          >
            {variacion > 0 ? "+" : ""}
            {formatNumero(variacion, 1)} {variacionSufijo ?? ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
