import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatNumero } from "@/lib/format";
import type { DatosEmbarque, SaldoLote } from "@/types/domain.types";

const embarqueSchema = z
  .object({
    numOrdenCompra: z.string().min(1, "Requerido").max(50),
    cantidadSolicitada: z.coerce.number().positive("Debe ser positivo"),
    cantidadEntrega: z.coerce.number().positive("Debe ser positivo"),
    numFactura: z.string().min(1, "Requerido").max(50),
    fechaEnvio: z.string().min(1, "Requerido"),
    fechaCaducidad: z.string().min(1, "Requerido"),
  })
  .refine((v) => v.cantidadEntrega <= v.cantidadSolicitada, {
    message: "La cantidad a entregar no puede exceder la solicitada",
    path: ["cantidadEntrega"],
  })
  .refine(
    (v) =>
      new Date(v.fechaCaducidad) >= new Date(v.fechaEnvio),
    {
      message: "La caducidad debe ser posterior o igual a la fecha de envío",
      path: ["fechaCaducidad"],
    },
  );

type EmbarqueValues = z.output<typeof embarqueSchema>;
type EmbarqueInput = z.input<typeof embarqueSchema>;

interface Props {
  embarque?: DatosEmbarque;
  loteId?: string | number;
  onConfirm: (e: DatosEmbarque) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function PasoEmbarque({
  embarque,
  loteId,
  onConfirm,
  onNext,
  onPrev,
}: Props) {
  const form = useForm<EmbarqueInput, unknown, EmbarqueValues>({
    resolver: zodResolver(embarqueSchema),
    defaultValues: {
      numOrdenCompra: embarque?.numOrdenCompra ?? "",
      cantidadSolicitada: embarque?.cantidadSolicitada ?? 0,
      cantidadEntrega: embarque?.cantidadEntrega ?? 0,
      numFactura: embarque?.numFactura ?? "",
      fechaEnvio: embarque?.fechaEnvio
        ? embarque.fechaEnvio.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      fechaCaducidad: embarque?.fechaCaducidad?.slice(0, 10) ?? "",
    },
  });

  const [saldo, setSaldo] = useState<SaldoLote | null>(null);
  const [saldoError, setSaldoError] = useState<string | null>(null);

  useEffect(() => {
    if (loteId === undefined) return;
    let cancelado = false;
    setSaldo(null);
    setSaldoError(null);
    api
      .get<SaldoLote>(`/lotes/${loteId}/saldo`)
      .then((r) => {
        if (!cancelado) setSaldo(r.data);
      })
      .catch(() => {
        if (!cancelado) {
          setSaldo(null);
          setSaldoError("No se pudo consultar el saldo del lote");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [loteId]);

  const cantidadEntregaActual = Number(form.watch("cantidadEntrega") ?? 0);
  const disponibleNum =
    saldo?.disponible !== null && saldo?.disponible !== undefined
      ? Number(saldo.disponible)
      : null;
  const excedeSaldo =
    disponibleNum !== null && cantidadEntregaActual > disponibleNum;
  const unidad = saldo?.unidadCantidad ?? "";

  const onSubmit = (values: EmbarqueValues) => {
    if (
      disponibleNum !== null &&
      values.cantidadEntrega > disponibleNum
    ) {
      form.setError("cantidadEntrega", {
        type: "manual",
        message: `Excede el saldo disponible del lote (${formatNumero(disponibleNum, 2)} ${unidad}).`,
      });
      return;
    }
    onConfirm({
      numOrdenCompra: values.numOrdenCompra,
      cantidadSolicitada: values.cantidadSolicitada,
      cantidadEntrega: values.cantidadEntrega,
      numFactura: values.numFactura,
      fechaEnvio: values.fechaEnvio,
      fechaCaducidad: values.fechaCaducidad,
    });
    onNext();
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Paso 3 · Datos de embarque
      </h2>

      {saldo && (
        <div
          className={
            excedeSaldo
              ? "rounded-md border border-state-danger/30 bg-state-danger/10 p-3 text-sm"
              : "rounded-md border border-border bg-secondary/30 p-3 text-sm"
          }
        >
          <p className="font-medium">Saldo del lote</p>
          <dl className="mt-1 grid grid-cols-3 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Producida</dt>
              <dd>
                {saldo.producida !== null
                  ? `${formatNumero(Number(saldo.producida), 2)} ${unidad}`
                  : "No registrada"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Entregada</dt>
              <dd>
                {formatNumero(Number(saldo.entregada), 2)} {unidad}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Disponible</dt>
              <dd className="font-semibold">
                {saldo.disponible !== null
                  ? `${formatNumero(Number(saldo.disponible), 2)} ${unidad}`
                  : "—"}
              </dd>
            </div>
          </dl>
          {saldo.producida === null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Este lote no tiene cantidad producida registrada; la validación
              de saldo no se aplicará.
            </p>
          )}
        </div>
      )}
      {saldoError && (
        <p className="text-xs text-state-warning">{saldoError}</p>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="numOrdenCompra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Núm. orden de compra *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numFactura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Núm. factura *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cantidadSolicitada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad solicitada *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={field.onChange}
                      value={(field.value as number | string | undefined) ?? 0}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cantidadEntrega"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad a entregar *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={field.onChange}
                      value={(field.value as number | string | undefined) ?? 0}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fechaEnvio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de envío *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fechaCaducidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de caducidad *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrev}>
              Anterior
            </Button>
            <Button
              type="submit"
              disabled={excedeSaldo}
              title={
                excedeSaldo
                  ? `La cantidad a entregar excede el saldo disponible (${formatNumero(disponibleNum ?? 0, 2)} ${unidad})`
                  : undefined
              }
            >
              Siguiente
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
