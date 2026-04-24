import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, handleApiError } from "@/lib/api";
import type { Producto } from "@/types/domain.types";
import type { PaginatedResponse } from "@/types/api.types";

const loteSchema = z.object({
  numeroLote: z.string().min(1, "Requerido").max(30),
  productoId: z.string().min(1, "Requerido"),
  fechaProduccion: z.string().min(1, "Requerido"),
  cantidadProducida: z.string().optional(),
  unidadCantidad: z.string().optional(),
});

type LoteFormValues = z.infer<typeof loteSchema>;

export function LoteForm() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm<LoteFormValues>({
    resolver: zodResolver(loteSchema),
    defaultValues: {
      numeroLote: "",
      productoId: "",
      fechaProduccion: new Date().toISOString().slice(0, 10),
      cantidadProducida: "",
      unidadCantidad: "kg",
    },
  });

  useEffect(() => {
    api
      .get<PaginatedResponse<Producto>>("/productos", { params: { limit: 100 } })
      .then((r) => setProductos(r.data.data))
      .catch(() => setProductos([]));
  }, []);

  const onSubmit = async (values: LoteFormValues) => {
    setSaveError(null);
    try {
      await api.post("/lotes", {
        numeroLote: values.numeroLote,
        productoId: values.productoId,
        fechaProduccion: values.fechaProduccion,
        cantidadProducida: values.cantidadProducida
          ? Number(values.cantidadProducida)
          : undefined,
        unidadCantidad: values.unidadCantidad || undefined,
      });
      toast.success("Lote creado");
      navigate("/lotes");
    } catch (err) {
      setSaveError(handleApiError(err));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb
        items={[{ label: "Lotes", to: "/lotes" }, { label: "Nuevo" }]}
      />
      <PageHeader title="Nuevo lote" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="numeroLote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de lote *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="productoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Producto *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map((p) => (
                      <SelectItem key={String(p.id)} value={String(p.id)}>
                        {p.clave} — {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fechaProduccion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de producción *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="cantidadProducida"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unidadCantidad"
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

          {saveError && (
            <div className="text-sm text-state-danger p-3 rounded-md border border-state-danger/30 bg-state-danger/5">
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => navigate("/lotes")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
