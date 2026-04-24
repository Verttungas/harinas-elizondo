import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const parametroSchema = z
  .object({
    clave: z.string().min(1, "Requerido").max(20),
    nombre: z.string().min(1, "Requerido").max(120),
    unidadMedida: z.string().min(1, "Requerido").max(20),
    desviacionAceptable: z.coerce.number().positive().optional(),
    limiteInferior: z.coerce.number(),
    limiteSuperior: z.coerce.number(),
  })
  .refine((v) => v.limiteSuperior > v.limiteInferior, {
    message: "Debe ser mayor que el límite inferior",
    path: ["limiteSuperior"],
  });

export type ParametroFormValues = z.output<typeof parametroSchema>;
type ParametroFormInput = z.input<typeof parametroSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<ParametroFormValues>;
  onSubmit: (values: ParametroFormValues) => void | Promise<void>;
}

const defaults: ParametroFormInput = {
  clave: "",
  nombre: "",
  unidadMedida: "",
  desviacionAceptable: undefined,
  limiteInferior: 0,
  limiteSuperior: 0,
};

export function ParametroFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: Props) {
  const form = useForm<ParametroFormInput, unknown, ParametroFormValues>({
    resolver: zodResolver(parametroSchema),
    defaultValues: { ...defaults, ...(initial as Partial<ParametroFormInput>) },
  });

  useEffect(() => {
    if (open)
      form.reset({ ...defaults, ...(initial as Partial<ParametroFormInput>) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (values: ParametroFormValues) => {
    await onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar parámetro" : "Agregar parámetro"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="clave"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clave</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!initial} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unidadMedida"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="limiteInferior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite inferior</FormLabel>
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
                name="limiteSuperior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite superior</FormLabel>
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
                name="desviacionAceptable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desv. aceptable</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        onChange={field.onChange}
                        value={(field.value as number | string | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
