import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatFecha } from "@/lib/format";
import type { WizardState } from "./WizardCertificado";

interface Props {
  state: WizardState;
  onPrev: () => void;
  onConfirm: () => void;
}

export function PasoRevision({ state, onPrev, onConfirm }: Props) {
  const { cliente, lote, inspecciones, embarque } = state;
  if (!cliente || !lote || !inspecciones || !embarque) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        == Paso 4: Revisión ==
      </h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cliente</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>
            <strong>
              {cliente.claveSap} — {cliente.nombre}
            </strong>
          </p>
          <p className="text-xs text-muted-foreground">
            RFC: {cliente.rfc}
          </p>
          <p className="text-xs text-muted-foreground">
            Correo destino: {cliente.contactoCorreo}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lote e inspecciones</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>{lote.numeroLote}</strong>
            {lote.producto && (
              <> · {lote.producto.clave} — {lote.producto.nombre}</>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {inspecciones.map((i) => (
              <div
                key={String(i.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card"
              >
                <span className="font-mono text-xs">{i.secuencia}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFecha(i.fechaInspeccion)}
                </span>
                {i.esFicticia && (
                  <StatusBadge status="BORRADOR" label="Ficticia" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Datos de embarque</CardTitle>
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Orden de compra</p>
            <p>{embarque.numOrdenCompra}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Factura</p>
            <p>{embarque.numFactura}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cantidad solicitada</p>
            <p>{embarque.cantidadSolicitada}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cantidad a entregar</p>
            <p>{embarque.cantidadEntrega}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha de envío</p>
            <p>{formatFecha(embarque.fechaEnvio)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha de caducidad</p>
            <p>{formatFecha(embarque.fechaCaducidad)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Anterior
        </Button>
        <Button onClick={onConfirm}>Emitir certificado</Button>
      </div>
    </section>
  );
}
