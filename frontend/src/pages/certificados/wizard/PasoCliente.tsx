import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import type { Cliente } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

interface Props {
  cliente?: Cliente;
  onSelect: (cliente: Cliente) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function PasoCliente({ cliente, onSelect, onNext, onCancel }: Props) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 400);
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQ) {
      setResultados([]);
      return;
    }
    setLoading(true);
    api
      .get<PaginatedResponse<Cliente>>("/clientes", {
        params: { q: debouncedQ, estado: "ACTIVO", limit: 10 },
      })
      .then((r) => setResultados(r.data.data))
      .catch(() => setResultados([]))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        == Paso 1: Cliente ==
      </h2>
      <div>
        <Label className="text-xs">Buscar cliente</Label>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Clave SAP, nombre o RFC..."
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Buscando...</p>
      )}

      {resultados.length > 0 && (
        <ul className="rounded-md border border-border bg-card divide-y">
          {resultados.map((c) => (
            <li
              key={String(c.id)}
              className={`p-3 cursor-pointer hover:bg-secondary/30 ${
                cliente?.id === c.id ? "bg-secondary/40" : ""
              }`}
              onClick={() => onSelect(c)}
            >
              <p className="text-sm font-medium">
                {c.claveSap} — {c.nombre}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.rfc} · {c.contactoCorreo ?? "sin correo"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {cliente && (
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-sm font-medium">Cliente seleccionado</p>
            <p className="text-sm">
              {cliente.claveSap} — {cliente.nombre}
            </p>
            <p className="text-xs text-muted-foreground">
              RFC: {cliente.rfc} · Correo: {cliente.contactoCorreo ?? "—"}
            </p>
            {!cliente.requiereCertificado && (
              <p className="text-xs text-state-warning">
                Este cliente no tiene requiereCertificado activo. Actívelo antes
                de continuar.
              </p>
            )}
            {!cliente.contactoCorreo && (
              <p className="text-xs text-state-danger">
                Sin correo de contacto. Regístrelo antes de emitir.
              </p>
            )}
            {(cliente.valoresReferencia ?? []).length > 0 && (
              <p className="text-xs text-state-success">
                Este cliente tiene valores de referencia particulares (
                {cliente.valoresReferencia?.length}).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={onNext}
          disabled={
            !cliente ||
            !cliente.requiereCertificado ||
            !cliente.contactoCorreo
          }
        >
          Siguiente
        </Button>
      </div>
    </section>
  );
}
