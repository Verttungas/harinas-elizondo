# Fase G — Frontend: Pantallas del Producto

## Prerrequisitos

- Fase F completada (frontend núcleo, auth, layout, componentes compartidos, shadcn/ui instalado).
- Fase E completada (todos los endpoints del backend disponibles).
- Login funciona y la navegación entre páginas placeholder responde.

## Objetivo

Reemplazar las 8 páginas placeholder de la Fase F por las pantallas funcionales del sistema, siguiendo los 10 wireframes de la Entrega 2. Conectar cada pantalla con sus endpoints correspondientes del backend. Implementar los formularios de captura, las tablas con paginación y filtros, el wizard de emisión de certificado, y el dashboard con KPIs.

## Contexto previo

Lee primero `CLAUDE.md` en la raíz. Los wireframes de referencia son los W-01 a W-10 generados en la Entrega 2. Los archivos `.puml` fuente están en `diagrams/wireframes/`; los PNG renderizados están en el Google Drive del Equipo 5 en la carpeta de la Entrega 2.

**Recuerda las convenciones transversales de UI establecidas en la Fase F:**
- Barra de menú superior consistente.
- Colores semánticos (verde/rojo/naranja/azul).
- Acciones primarias a la derecha, secundarias a la izquierda.
- Breadcrumb arriba de formularios.
- Títulos con separadores (== Sección ==).
- Loading con skeletons, no spinners.
- Estados vacíos con acción.
- Confirmación para acciones destructivas.

## Alcance de esta fase (qué SÍ se hace)

- **Dashboard** (W-02): KPIs del mes, acciones rápidas, últimos certificados.
- **Equipos** (W-03 y W-04): listado con filtros, formulario de alta/edición con parámetros.
- **Clientes** (W-05 y W-06): listado con filtros, formulario con valores de referencia particulares.
- **Inspecciones** (W-07): formulario de captura con resultados agrupados por equipo, asignación automática de secuencia visible.
- **Certificados**:
  - Listado con filtros y acciones (ver, descargar PDF, reenviar).
  - **Wizard de emisión** (W-08): 4 pasos con estado persistente.
- **Reportes** (W-10): filtros unificados, tabs, placeholder de gráficas (usar Recharts).
- Modales para acciones de estado (inactivar, dar de baja, reactivar) con captura de motivo.
- Modal de edición de certificado (generación de inspección ficticia).

## Alcance que NO se hace en esta fase

- No crees nuevas pantallas fuera de los 10 wireframes.
- No implementes features no pedidas (búsqueda avanzada, exportaciones extras, etc.).
- No optimices performance más allá de lo básico.
- No implementes tests (Fase H).

## Estrategia de implementación

Por la cantidad de trabajo, conviene agrupar las pantallas en bloques coherentes. Cada bloque entrega una funcionalidad completa end-to-end, para poder validar incrementalmente.

**Orden sugerido (de menor a mayor complejidad):**

1. Bloque A: Dashboard simple (ya conoces los endpoints de reportes).
2. Bloque B: Productos (solo listado y alta mínima).
3. Bloque C: Equipos (listado + formulario completo).
4. Bloque D: Clientes (listado + formulario con valores particulares).
5. Bloque E: Lotes (listado y alta).
6. Bloque F: Inspecciones (listado + formulario con asignación automática).
7. Bloque G: Certificados (listado + wizard de 4 pasos).
8. Bloque H: Reportes (filtros + 4 tabs con gráficas).

## Dependencias adicionales

- `recharts` — gráficas para dashboard y reportes.

Instalar con `docker compose exec frontend npm install recharts`.

## Patrones de implementación por tipo de pantalla

### Listados

Todos los listados siguen la misma estructura:

```tsx
function ListadoX() {
  const [filters, setFilters] = useState({ q: '', estado: 'ACTIVO', page: 1 });
  const debouncedQ = useDebounce(filters.q, 400);

  const { data, isLoading, error } = useApi(() =>
    api.get('/recurso', { params: { ...filters, q: debouncedQ } })
  , [debouncedQ, filters.estado, filters.page]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Recurso" actions={<Button onClick={...}>Nuevo</Button>} />
      <FiltersBar filters={filters} onChange={setFilters} />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pagination={data?.pagination}
        loading={isLoading}
      />
    </div>
  );
}
```

### Formularios (alta/edición)

Usan `react-hook-form` con resolver de Zod. Patrón:

```tsx
function FormularioX({ id?: string }) {
  const isEdit = !!id;
  const { data: existente } = useApi(() => api.get(`/recurso/${id}`), [id], { enabled: isEdit });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? mapToForm(existente) : defaults,
  });

  const onSubmit = async (values) => {
    try {
      if (isEdit) await api.put(`/recurso/${id}`, values);
      else await api.post('/recurso', values);
      toast.success('Guardado correctamente');
      navigate('/recurso');
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <Breadcrumb ... />
      <PageHeader title={isEdit ? 'Editar X' : 'Nuevo X'} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Secciones del formulario */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => navigate('/recurso')}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

### Wizards (certificados)

El wizard de 4 pasos usa estado local con `useReducer` para manejar los pasos:

```tsx
type WizardState = {
  step: 1 | 2 | 3 | 4;
  cliente?: Cliente;
  lote?: Lote;
  inspecciones?: bigint[];
  embarque?: DatosEmbarque;
};

function WizardCertificado() {
  const [state, dispatch] = useReducer(reducer, { step: 1 });

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <StepIndicator current={state.step} />
      {state.step === 1 && <PasoCliente ... />}
      {state.step === 2 && <PasoLoteInspecciones ... />}
      {state.step === 3 && <PasoEmbarque ... />}
      {state.step === 4 && <PasoRevision ... />}
    </div>
  );
}
```

## Detalle por pantalla

### Dashboard (reemplaza placeholder)

Según W-02:
- 4 tarjetas de KPIs desde `GET /reportes/resumen`.
- 4 botones de acciones rápidas: "Registrar inspección", "Emitir certificado", "Nuevo cliente", "Registrar lote". Cada uno navega a la ruta correspondiente.
- Tabla de los últimos 5 certificados desde `GET /certificados?limit=5`.

Usar `<Card>` de shadcn/ui para las tarjetas de KPI. Número grande (`text-2xl font-bold`), label abajo (`text-sm`), y variación vs mes anterior (`text-xs text-success` o `text-danger` según signo).

### Equipos — Listado (W-03)

- Filtros: búsqueda por clave/descripción, estado (Todos/Activos/Inactivos/Baja), marca (dropdown con valores únicos de la BD).
- Columnas: Clave, Descripción corta, Marca, Modelo, Ubicación, Estado, Acciones.
- Acciones por fila según estado:
  - ACTIVO: Ver, Editar, Inactivar.
  - INACTIVO: Ver, Reactivar.
  - BAJA: Ver.

Botón "Nuevo equipo" en la esquina superior derecha.

### Equipos — Formulario (W-04)

Dos secciones:
1. **Datos generales**: grid de 2 columnas con los campos del schema.
2. **Parámetros**: tabla editable. Botón "Agregar parámetro" abre un modal con los campos del parámetro. Eliminación y edición inline.

Validación client-side con Zod:
- Clave única (check al submit via error del backend).
- Al menos un parámetro.
- `limiteInferior < limiteSuperior` en cada parámetro.

Botones al final: Cancelar, "Guardar y agregar otro", Guardar.

### Clientes — Listado (W-05)

Similar a Equipos. Filtros adicionales: Estado, Requiere certificado (Sí/No/Todos). Columnas: Clave SAP, Nombre, RFC, Contacto, Requiere Cert., Estado, Acciones.

### Clientes — Formulario (W-06)

Tres secciones:
1. **Datos generales**.
2. **Configuración de certificados**: checkbox "Requiere certificado" + nota sobre correo obligatorio si está marcado.
3. **Valores de referencia particulares** (condicional si requiere certificado):
   - Tabla con: Equipo, Parámetro (combo dependiente), Rango internacional (readonly), Lím. inferior cliente, Lím. superior cliente, Acciones.
   - Botón "Agregar valor de referencia particular".
   - Advertencia visible: "Los rangos particulares deben estar dentro del rango internacional".

### Inspecciones — Listado (W-07 variante, no hay listado en W-07, pero agregamos uno lógico)

- Filtros: Lote, Estado, Es ficticia.
- Columnas: Lote, Secuencia, Fecha, Estado, Ficticia (badge si true), Acciones (Ver, Editar si BORRADOR).

### Inspecciones — Formulario (W-07)

- Paso 1 (sección): **Lote de producción**. Campo con búsqueda de lote. Si el lote no existe, ofrecer crearlo inline.
- Paso 2 (sección automática): **Asignación automática**. Texto informativo: "Este lote no tiene inspecciones previas. La secuencia será 'A' (análisis inicial)." o "La última inspección fue 'C'. La siguiente será 'D' (análisis subsecuente)."
- Paso 3 (sección): **Resultados**. Agrupados por equipo. Para cada parámetro, mostrar columnas: Parámetro, Unidad, Rango internacional, Valor obtenido (input), Estado esperado (badge dinámico: verde si dentro, rojo si fuera, computado en el cliente).
- Paso 4 (sección): **Observaciones** (textarea).

Botones: Cancelar, "Guardar como borrador", "Guardar y cerrar inspección".

### Certificados — Listado

- Filtros: Cliente, Lote, Estado, Rango de fechas.
- Columnas: Número, Cliente, Lote, Fecha emisión, Estado, Acciones (Ver, Descargar PDF, Reenviar si parcial o fallido).

### Certificados — Wizard (W-08)

**Paso 1 — Cliente:**
- Buscador de clientes (autocomplete con `GET /clientes?q=...`).
- Al seleccionar, mostrar datos del cliente y si tiene valores particulares.

**Paso 2 — Lote e inspecciones:**
- Input de número de lote con búsqueda.
- Al encontrar el lote, listar sus inspecciones CERRADAS con checkboxes.
- El usuario selecciona una o más.
- Indicador visual si alguna inspección seleccionada es ficticia.

**Paso 3 — Datos de embarque:**
- Formulario con los campos de `datosEmbarque` del schema.
- Validar que `cantidadEntrega <= cantidadSolicitada`.
- Validar que `fechaCaducidad >= fechaEnvio`.

**Paso 4 — Revisión:**
- Mostrar vista previa completa: datos del cliente, lote, resultados consolidados contra valores aplicables (particulares o internacionales), datos de embarque, destinatarios del correo.
- Al confirmar "Emitir certificado":
  - Llamar `POST /certificados` con todo el payload.
  - Mostrar toast con el número asignado.
  - Navegar al detalle del certificado con la opción de descargar PDF.

**Manejo del wizard:**
- Botón "Anterior" regresa sin perder datos.
- El estado se mantiene en memoria (useReducer).
- Si el usuario navega fuera del wizard, preguntar confirmación ("Hay cambios sin guardar. ¿Descartar?").

### Certificados — Detalle

- Muestra toda la información del certificado emitido.
- Botones: Descargar PDF, Reenviar (si hay envíos pendientes/fallidos).
- Lista de envíos con su estado.
- No editable (RN-37).

### Reportes (W-10)

- Filtros al principio: Período (dropdown con opciones predefinidas + rango personalizado), Cliente, Producto, Parámetro.
- Tabs: Tendencia por parámetro | Certificados por cliente | Desviaciones por lote | Inspecciones ficticias.
- Cada tab renderiza una gráfica con Recharts (LineChart, BarChart según el caso).
- Tabla de detalle debajo de la gráfica.
- Botones Export CSV y Export PNG.

### Modal de baja/inactivación (componente reutilizable)

Props: `open`, `onClose`, `onConfirm`, `title`, `entidad`, `requireMotivo: boolean`.

Textarea para motivo con validación `min(1)`. Botones Cancelar y Confirmar.

## Procedimiento sugerido

Para esta fase, el procedimiento **no** está tan bloqueado como las anteriores. Seguir el orden de bloques A a H es recomendado, pero si algún integrante del equipo quiere saltarse a una pantalla específica, puede hacerlo siempre que la Fase F esté lista.

Para cada bloque (pantalla mayor):

1. Crear los componentes nuevos necesarios.
2. Implementar el listado.
3. Implementar el formulario (si aplica).
4. Implementar modales/dialogs asociados.
5. Probar manualmente en el navegador:
   - Crear un recurso.
   - Editarlo.
   - Inactivarlo/darlo de baja.
   - Verificar que los datos se persisten (refrescar página).
   - Verificar que los permisos funcionan (login como LABORATORIO e intentar POST → debe ver 403 o el botón oculto).
6. Commit incremental: `feat: implement <pantalla> (Phase G - block X)`.

## Criterios de éxito de la Fase G

- [ ] Todas las rutas navegan a pantallas funcionales (no placeholders).
- [ ] Dashboard muestra KPIs reales desde el backend.
- [ ] Cada listado carga datos del backend, soporta filtros y paginación.
- [ ] Cada formulario valida client-side y muestra errores del backend.
- [ ] Wizard de certificado completa el flujo end-to-end: genera certificado, PDF, y MailHog recibe los correos.
- [ ] Modal de inactivación/baja pide motivo.
- [ ] Modal de edición de certificado crea inspección ficticia.
- [ ] Acciones destructivas piden confirmación.
- [ ] Estados vacíos, de carga y de error manejados consistentemente.
- [ ] Autorización reflejada en UI (botones ocultos o deshabilitados según rol).
- [ ] Compilación TypeScript sin errores.
- [ ] `docker compose logs frontend` sin errores.

## Si algo falla

- Si recharts no renderiza, verifica que el contenedor tenga dimensiones explícitas (`height`).
- Si un form no submitea, revisa que el Zod schema coincide con los nombres de campos de la API.
- Si los tipos TS de un response no coinciden con lo que llega, actualiza `frontend/src/types/`.
- Si el wizard pierde estado al cambiar de paso, verifica que `useReducer` está fuera del render de cada paso.

## Entregables

Aproximadamente:

```
frontend/src/pages/
├── Dashboard.tsx                     (implementado)
├── equipos/
│   ├── EquiposListado.tsx
│   └── EquipoForm.tsx
├── clientes/
│   ├── ClientesListado.tsx
│   └── ClienteForm.tsx
├── inspecciones/
│   ├── InspeccionesListado.tsx
│   └── InspeccionForm.tsx
├── certificados/
│   ├── CertificadosListado.tsx
│   ├── CertificadoDetalle.tsx
│   └── wizard/
│       ├── WizardCertificado.tsx
│       ├── PasoCliente.tsx
│       ├── PasoLoteInspecciones.tsx
│       ├── PasoEmbarque.tsx
│       └── PasoRevision.tsx
├── lotes/
│   ├── LotesListado.tsx
│   └── LoteForm.tsx
└── reportes/
    ├── Reportes.tsx
    └── tabs/
        ├── TabParametros.tsx
        ├── TabCertificadosPorCliente.tsx
        ├── TabDesviaciones.tsx
        └── TabFicticias.tsx

frontend/src/components/
├── equipos/
│   └── ParametroFormDialog.tsx
├── clientes/
│   └── ValorReferenciaFormDialog.tsx
├── certificados/
│   ├── StepIndicator.tsx
│   └── EditarCertificadoDialog.tsx
└── shared/
    └── MotivoDialog.tsx                    (modal reutilizable para motivos)
```

Aproximadamente 35–45 archivos nuevos en el frontend.