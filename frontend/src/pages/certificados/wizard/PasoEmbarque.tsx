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
import type { DatosEmbarque } from "@/types/domain.types";

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
  onConfirm: (e: DatosEmbarque) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function PasoEmbarque({ embarque, onConfirm, onNext, onPrev }: Props) {
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

  const onSubmit = (values: EmbarqueValues) => {
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
            <Button type="submit">Siguiente</Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
