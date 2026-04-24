import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
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
import {
  ParametroFormDialog,
  type ParametroFormValues,
} from "@/components/equipos/ParametroFormDialog";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { api, handleApiError } from "@/lib/api";
import type { Equipo, Parametro } from "@/types/domain.types";
import { toNumber } from "@/lib/number";

const equipoSchema = z.object({
  clave: z.string().min(1, "Requerido").max(20),
  descripcionCorta: z.string().min(1, "Requerido").max(80),
  descripcionLarga: z.string().optional(),
  marca: z.string().max(60).optional(),
  modelo: z.string().max(60).optional(),
  serie: z.string().max(60).optional(),
  proveedor: z.string().max(120).optional(),
  ubicacion: z.string().max(120).optional(),
  responsable: z.string().max(120).optional(),
  fechaAdquisicion: z.string().optional(),
  vigenciaGarantia: z.string().optional(),
});

type EquipoFormValues = z.infer<typeof equipoSchema>;

export function EquipoForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parametros, setParametros] = useState<ParametroFormValues[]>([]);
  const [parametrosExistentes, setParametrosExistentes] = useState<Parametro[]>(
    [],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const form = useForm<EquipoFormValues>({
    resolver: zodResolver(equipoSchema),
    defaultValues: {
      clave: "",
      descripcionCorta: "",
      descripcionLarga: "",
      marca: "",
      modelo: "",
      serie: "",
      proveedor: "",
      ubicacion: "",
      responsable: "",
      fechaAdquisicion: "",
      vigenciaGarantia: "",
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api
      .get<Equipo>(`/equipos/${id}`)
      .then((r) => {
        const e = r.data;
        form.reset({
          clave: e.clave,
          descripcionCorta: e.descripcionCorta,
          descripcionLarga: e.descripcionLarga ?? "",
          marca: e.marca ?? "",
          modelo: e.modelo ?? "",
          serie: e.serie ?? "",
          proveedor: e.proveedor ?? "",
          ubicacion: e.ubicacion ?? "",
          responsable: e.responsable ?? "",
          fechaAdquisicion: e.fechaAdquisicion?.slice(0, 10) ?? "",
          vigenciaGarantia: e.vigenciaGarantia?.slice(0, 10) ?? "",
        });
        setParametrosExistentes(e.parametros ?? []);
      })
      .catch((err) => setLoadError(handleApiError(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (values: EquipoFormValues) => {
    setSaveError(null);
    if (!isEdit && parametros.length === 0) {
      setSaveError("Debe registrar al menos un parámetro");
      return;
    }
    try {
      const payload = sanitize(values);
      if (isEdit) {
        await api.put(`/equipos/${id}`, payload);
        toast.success("Equipo actualizado");
      } else {
        await api.post("/equipos", { ...payload, parametros });
        toast.success("Equipo creado");
      }
      navigate("/equipos");
    } catch (err) {
      setSaveError(handleApiError(err));
    }
  };

  const handleParametroSubmit = async (values: ParametroFormValues) => {
    if (isEdit) {
      try {
        if (editIndex !== null) {
          const existente = parametrosExistentes[editIndex];
          if (!existente) return;
          await api.put(`/equipos/${id}/parametros/${existente.id}`, {
            nombre: values.nombre,
            unidadMedida: values.unidadMedida,
            desviacionAceptable: values.desviacionAceptable,
            limiteInferior: values.limiteInferior,
            limiteSuperior: values.limiteSuperior,
          });
        } else {
          await api.post(`/equipos/${id}/parametros`, values);
        }
        const nuevo = await api.get<Equipo>(`/equipos/${id}`);
        setParametrosExistentes(nuevo.data.parametros ?? []);
        toast.success("Parámetro guardado");
      } catch (err) {
        toast.error(handleApiError(err));
        throw err;
      }
    } else {
      if (editIndex !== null) {
        setParametros((prev) =>
          prev.map((p, i) => (i === editIndex ? values : p)),
        );
      } else {
        setParametros((prev) => [...prev, values]);
      }
    }
    setEditIndex(null);
  };

  const handleEliminar = async (index: number) => {
    if (isEdit) {
      const existente = parametrosExistentes[index];
      if (!existente) return;
      if (!confirm("¿Inactivar este parámetro?")) return;
      try {
        await api.delete(`/equipos/${id}/parametros/${existente.id}`);
        setParametrosExistentes((prev) => prev.filter((_, i) => i !== index));
        toast.success("Parámetro inactivado");
      } catch (err) {
        toast.error(handleApiError(err));
      }
    } else {
      setParametros((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const parametrosVisibles: Array<{
    clave: string;
    nombre: string;
    unidadMedida: string;
    limiteInferior: number;
    limiteSuperior: number;
    desviacionAceptable?: number;
  }> = isEdit
    ? parametrosExistentes.map((p) => ({
        clave: p.clave,
        nombre: p.nombre,
        unidadMedida: p.unidadMedida,
        limiteInferior: toNumber(p.limiteInferior),
        limiteSuperior: toNumber(p.limiteSuperior),
        desviacionAceptable: p.desviacionAceptable
          ? toNumber(p.desviacionAceptable)
          : undefined,
      }))
    : parametros;

  if (loading) return <LoadingState rows={6} />;
  if (loadError)
    return <ErrorState message={loadError} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb
        items={[
          { label: "Equipos", to: "/equipos" },
          { label: isEdit ? "Editar" : "Nuevo" },
        ]}
      />
      <PageHeader title={isEdit ? "Editar equipo" : "Nuevo equipo"} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              == Datos generales ==
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clave"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clave *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcionCorta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción corta *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serie</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="proveedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ubicacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsable</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaAdquisicion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de adquisición</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vigenciaGarantia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigencia de garantía</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="descripcionLarga"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción larga</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                == Parámetros ==
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditIndex(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Agregar parámetro
              </Button>
            </div>
            <div className="rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clave</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Lím. inferior</TableHead>
                    <TableHead>Lím. superior</TableHead>
                    <TableHead>Desv.</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parametrosVisibles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground p-4"
                      >
                        Sin parámetros. Agregue al menos uno.
                      </TableCell>
                    </TableRow>
                  ) : (
                    parametrosVisibles.map((p, i) => (
                      <TableRow key={`${p.clave}-${i}`}>
                        <TableCell className="font-mono">{p.clave}</TableCell>
                        <TableCell>{p.nombre}</TableCell>
                        <TableCell>{p.unidadMedida}</TableCell>
                        <TableCell>{p.limiteInferior}</TableCell>
                        <TableCell>{p.limiteSuperior}</TableCell>
                        <TableCell>{p.desviacionAceptable ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditIndex(i);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleEliminar(i)}
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

          {saveError && (
            <div className="text-sm text-state-danger p-3 rounded-md border border-state-danger/30 bg-state-danger/5">
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/equipos")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {isEdit ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </form>
      </Form>

      <ParametroFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={
          editIndex !== null
            ? (parametrosVisibles[editIndex] as ParametroFormValues)
            : undefined
        }
        onSubmit={handleParametroSubmit}
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
