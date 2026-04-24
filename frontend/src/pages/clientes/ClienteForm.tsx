import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  ValorReferenciaFormDialog,
  type ValorReferenciaFormValues,
} from "@/components/clientes/ValorReferenciaFormDialog";
import { api, handleApiError } from "@/lib/api";
import type { Cliente, ValorReferenciaParticular } from "@/types/domain.types";
import { toNumber } from "@/lib/number";

const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

const clienteSchema = z.object({
  claveSap: z.string().min(1, "Requerido").max(20),
  nombre: z.string().min(1, "Requerido").max(200),
  rfc: z.string().regex(rfcRegex, "RFC inválido"),
  domicilio: z.string().optional(),
  contactoNombre: z.string().max(120).optional(),
  contactoCorreo: z
    .union([z.string().email("Correo inválido"), z.literal("")])
    .optional(),
  contactoTelefono: z.string().max(20).optional(),
  requiereCertificado: z.boolean(),
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

export function ClienteForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [valores, setValores] = useState<ValorReferenciaFormValues[]>([]);
  const [valoresExistentes, setValoresExistentes] = useState<
    ValorReferenciaParticular[]
  >([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      claveSap: "",
      nombre: "",
      rfc: "",
      domicilio: "",
      contactoNombre: "",
      contactoCorreo: "",
      contactoTelefono: "",
      requiereCertificado: true,
    },
  });

  const requiereCert = form.watch("requiereCertificado");

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api
      .get<Cliente>(`/clientes/${id}`)
      .then((r) => {
        const c = r.data;
        form.reset({
          claveSap: c.claveSap,
          nombre: c.nombre,
          rfc: c.rfc,
          domicilio: c.domicilio ?? "",
          contactoNombre: c.contactoNombre ?? "",
          contactoCorreo: c.contactoCorreo ?? "",
          contactoTelefono: c.contactoTelefono ?? "",
          requiereCertificado: c.requiereCertificado,
        });
        setValoresExistentes(c.valoresReferencia ?? []);
      })
      .catch((err) => setLoadError(handleApiError(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (values: ClienteFormValues) => {
    setSaveError(null);
    try {
      const payload = sanitize(values);
      if (isEdit) {
        await api.put(`/clientes/${id}`, payload);
        toast.success("Cliente actualizado");
      } else {
        await api.post("/clientes", {
          ...payload,
          valoresReferencia:
            values.requiereCertificado && valores.length > 0
              ? valores.map((v) => ({
                  parametroId: v.parametroId,
                  limiteInferior: v.limiteInferior,
                  limiteSuperior: v.limiteSuperior,
                }))
              : undefined,
        });
        toast.success("Cliente creado");
      }
      navigate("/clientes");
    } catch (err) {
      setSaveError(handleApiError(err));
    }
  };

  const handleAgregarValor = async (v: ValorReferenciaFormValues) => {
    if (isEdit) {
      try {
        await api.post(`/clientes/${id}/valores-referencia`, {
          parametroId: v.parametroId,
          limiteInferior: v.limiteInferior,
          limiteSuperior: v.limiteSuperior,
        });
        const r = await api.get<Cliente>(`/clientes/${id}`);
        setValoresExistentes(r.data.valoresReferencia ?? []);
        toast.success("Valor de referencia agregado");
      } catch (err) {
        toast.error(handleApiError(err));
      }
    } else {
      setValores((prev) => [...prev, v]);
    }
  };

  const handleEliminarValor = async (index: number) => {
    if (isEdit) {
      const vr = valoresExistentes[index];
      if (!vr) return;
      if (!confirm("¿Eliminar este valor de referencia?")) return;
      try {
        await api.delete(`/clientes/${id}/valores-referencia/${vr.id}`);
        setValoresExistentes((prev) => prev.filter((_, i) => i !== index));
        toast.success("Valor eliminado");
      } catch (err) {
        toast.error(handleApiError(err));
      }
    } else {
      setValores((prev) => prev.filter((_, i) => i !== index));
    }
  };

  if (loading) return <LoadingState rows={6} />;
  if (loadError)
    return <ErrorState message={loadError} onRetry={() => window.location.reload()} />;

  const valoresVisibles: Array<{
    parametroId: string;
    parametroClave: string;
    parametroNombre: string;
    unidadMedida: string;
    rangoInternacional: string;
    limiteInferior: number;
    limiteSuperior: number;
  }> = isEdit
    ? valoresExistentes.map((v) => ({
        parametroId: String(v.parametroId),
        parametroClave: v.parametro?.clave ?? "—",
        parametroNombre: v.parametro?.nombre ?? "—",
        unidadMedida: v.parametro?.unidadMedida ?? "",
        rangoInternacional: v.parametro
          ? `[${toNumber(v.parametro.limiteInferior)}, ${toNumber(v.parametro.limiteSuperior)}]`
          : "—",
        limiteInferior: toNumber(v.limiteInferior),
        limiteSuperior: toNumber(v.limiteSuperior),
      }))
    : valores.map((v) => ({
        parametroId: v.parametroId,
        parametroClave: "—",
        parametroNombre: "—",
        unidadMedida: "",
        rangoInternacional: "—",
        limiteInferior: v.limiteInferior,
        limiteSuperior: v.limiteSuperior,
      }));

  const excluirParametroIds = isEdit
    ? valoresExistentes.map((v) => String(v.parametroId))
    : valores.map((v) => v.parametroId);

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Clientes", to: "/clientes" },
          { label: isEdit ? "Editar" : "Nuevo" },
        ]}
      />
      <PageHeader title={isEdit ? "Editar cliente" : "Nuevo cliente"} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Datos generales
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="claveSap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clave SAP *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rfc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RFC *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domicilio"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Domicilio</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactoNombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactoCorreo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactoTelefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Configuración de certificados
            </h2>
            <FormField
              control={form.control}
              name="requiereCertificado"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <span className="text-sm">
                      Este cliente requiere certificado de calidad
                    </span>
                  </label>
                  {field.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      El correo de contacto será obligatorio al emitir
                      certificados.
                    </p>
                  )}
                </FormItem>
              )}
            />
          </section>

          {requiereCert && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valores de referencia particulares
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
              <div className="text-xs text-state-warning p-2 rounded border border-state-warning/30 bg-state-warning/5">
                Los rangos particulares deben estar dentro del rango
                internacional del parámetro.
              </div>
              <div className="rounded-md border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parámetro</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Rango internacional</TableHead>
                      <TableHead>Lím. inf.</TableHead>
                      <TableHead>Lím. sup.</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valoresVisibles.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground p-4"
                        >
                          Sin valores de referencia particulares.
                        </TableCell>
                      </TableRow>
                    ) : (
                      valoresVisibles.map((v, i) => (
                        <TableRow key={`${v.parametroId}-${i}`}>
                          <TableCell>
                            <span className="font-mono">{v.parametroClave}</span>{" "}
                            — {v.parametroNombre}
                          </TableCell>
                          <TableCell>{v.unidadMedida}</TableCell>
                          <TableCell>{v.rangoInternacional}</TableCell>
                          <TableCell>{v.limiteInferior}</TableCell>
                          <TableCell>{v.limiteSuperior}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleEliminarValor(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

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
              onClick={() => navigate("/clientes")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </form>
      </Form>

      <ValorReferenciaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAgregarValor}
        excluirParametroIds={excluirParametroIds}
      />
    </div>
  );
}

function sanitize<T extends Record<string, unknown>>(values: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "" || v === undefined) continue;
    result[k] = v;
  }
  return result as Partial<T>;
}
