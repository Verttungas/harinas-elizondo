import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { api, handleApiError } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api.types";
import type { Rol, Usuario } from "@/types/domain.types";

type EstadoFiltro = "ACTIVO" | "INACTIVO" | "TODOS";
type RolFiltro = Rol | "TODOS";

const roles: Array<{ value: Rol; label: string }> = [
  { value: "ADMINISTRADOR", label: "Administrador" },
  { value: "LABORATORIO", label: "Laboratorio" },
  { value: "CONTROL_CALIDAD", label: "Control calidad" },
  { value: "ASEGURAMIENTO_CALIDAD", label: "Aseguramiento calidad" },
  { value: "GERENTE_PLANTA", label: "Gerente planta" },
  { value: "DIRECTOR_OPERACIONES", label: "Director operaciones" },
];

const rolLabel = new Map(roles.map((rol) => [rol.value, rol.label]));

interface UsuarioFormState {
  id?: string | number;
  correo: string;
  nombre: string;
  rol: Rol;
  activo: "true" | "false";
  password: string;
}

const emptyForm: UsuarioFormState = {
  correo: "",
  nombre: "",
  rol: "LABORATORIO",
  activo: "true",
  password: "",
};

export function UsuariosListado() {
  const { usuario: usuarioActual } = useAuth();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("TODOS");
  const [rol, setRol] = useState<RolFiltro>("TODOS");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 400);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UsuarioFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [usuarioEliminar, setUsuarioEliminar] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, refetch } = useQuery(
    () =>
      api
        .get<PaginatedResponse<Usuario>>("/usuarios", {
          params: {
            page,
            limit: 20,
            estado,
            rol,
            ...(debouncedQ ? { q: debouncedQ } : {}),
          },
        })
        .then((r) => r.data),
    [debouncedQ, estado, rol, page],
  );

  const editing = form.id !== undefined;
  const isSelf = useMemo(
    () => String(form.id ?? "") === String(usuarioActual?.id ?? ""),
    [form.id, usuarioActual?.id],
  );

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (usuario: Usuario) => {
    setForm({
      id: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
      activo: usuario.activo === false ? "false" : "true",
      password: "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        correo: form.correo,
        nombre: form.nombre,
        rol: form.rol,
        activo: form.activo === "true",
        ...(form.password ? { password: form.password } : {}),
      };
      if (editing) {
        await api.put(`/usuarios/${form.id}`, payload);
        toast.success("Usuario actualizado");
      } else {
        await api.post("/usuarios", {
          ...payload,
          password: form.password,
        });
        toast.success("Usuario creado");
      }
      setFormOpen(false);
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!usuarioEliminar) return;
    setDeleting(true);
    try {
      await api.delete(`/usuarios/${usuarioEliminar.id}`);
      toast.success("Usuario eliminado");
      setUsuarioEliminar(null);
      void refetch();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<Usuario>[] = [
    { key: "nombre", header: "Nombre" },
    { key: "correo", header: "Correo" },
    {
      key: "rol",
      header: "Rol",
      render: (u) => rolLabel.get(u.rol) ?? u.rol,
    },
    {
      key: "activo",
      header: "Estado",
      render: (u) => (
        <Badge variant={u.activo === false ? "secondary" : "default"}>
          {u.activo === false ? "Inactivo" : "Activo"}
        </Badge>
      ),
    },
    {
      key: "intentosFallidos",
      header: "Intentos",
      render: (u) => u.intentosFallidos ?? 0,
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (u) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(u)}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUsuarioEliminar(u)}
            disabled={String(u.id) === String(usuarioActual?.id)}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Administracion de accesos y roles del sistema"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo usuario
          </Button>
        }
      />

      <FiltersBar>
        <div className="flex-1 min-w-[220px]">
          <Label className="text-xs">Busqueda</Label>
          <Input
            placeholder="Nombre o correo..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="min-w-[150px]">
          <Label className="text-xs">Estado</Label>
          <Select
            value={estado}
            onValueChange={(v) => {
              setEstado(v as EstadoFiltro);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ACTIVO">Activos</SelectItem>
              <SelectItem value="INACTIVO">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[220px]">
          <Label className="text-xs">Rol</Label>
          <Select
            value={rol}
            onValueChange={(v) => {
              setRol(v as RolFiltro);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              {roles.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FiltersBar>

      <DataTable<Usuario>
        columns={columns}
        data={data?.data ?? []}
        loading={loading}
        rowKey={(u) => String(u.id)}
        emptyMessage="No hay usuarios con estos filtros"
        pagination={
          data?.pagination
            ? {
                page: data.pagination.page,
                limit: data.pagination.limit,
                total: data.pagination.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              Define correo, rol y estado de acceso.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="usuario-nombre">Nombre</Label>
              <Input
                id="usuario-nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usuario-correo">Correo</Label>
              <Input
                id="usuario-correo"
                type="email"
                value={form.correo}
                onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usuario-password">
                {editing ? "Nueva password" : "Password"}
              </Label>
              <Input
                id="usuario-password"
                type="password"
                value={form.password}
                placeholder={editing ? "Dejar vacio para conservarla" : ""}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Rol</Label>
                <Select
                  value={form.rol}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, rol: v as Rol }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select
                  value={form.activo}
                  disabled={isSelf}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, activo: v as "true" | "false" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.nombre ||
                !form.correo ||
                (!editing && !form.password)
              }
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {usuarioEliminar && (
        <ConfirmDialog
          open={!!usuarioEliminar}
          onOpenChange={(open) => !open && setUsuarioEliminar(null)}
          title="Eliminar usuario"
          description={`El usuario ${usuarioEliminar.correo} quedara inactivo y no podra iniciar sesion.`}
          confirmLabel="Eliminar"
          destructive
          loading={deleting}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
