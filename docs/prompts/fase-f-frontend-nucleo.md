# Fase F — Frontend: Núcleo, Routing, Autenticación y Sistema de Diseño

## Prerrequisitos

- Fase A completada: estructura `frontend/` existe con Vite + React + TypeScript + Tailwind funcionando.
- Fases B, C y D del backend completadas (para que el login y los primeros CRUD funcionen end-to-end).
- **Esta fase puede ejecutarse en paralelo a la Fase E** del backend. No requiere que los módulos de inspecciones/certificados/reportes estén listos.
- `docker compose up -d` levanta los servicios sin errores y `http://localhost:5173` carga la página placeholder de la Fase A.

## Objetivo

Montar la columna vertebral del frontend: enrutamiento con React Router, sistema de autenticación con JWT persistente, cliente HTTP con interceptores, layout base con barra de navegación, manejo de estados globales (usuario autenticado), sistema de diseño minimalista y explícito, y los primeros componentes de shadcn/ui instalados. Al finalizar, el usuario puede iniciar sesión contra el backend real y navegar entre rutas protegidas.

## Contexto previo

Lee primero `CLAUDE.md` en la raíz. Recordatorio importante:
- **No uses** el skill de `frontend-design`; su estética no encaja con un sistema LIMS B2B.
- La UI debe ser sobria, densa, eficiente. Como SAP ByD o herramientas enterprise serias.
- Inter es la fuente correcta para este contexto (a pesar de lo que diga el skill antes mencionado).
- Colores semánticos (verde = OK, rojo = fuera de espec, naranja = alerta, azul = info), no estéticos.

## Alcance de esta fase (qué SÍ se hace)

- Dependencias adicionales: `react-router-dom`, `axios`, `zustand` (estado global), `zod` (validación client-side), `lucide-react` (iconos), `react-hook-form`, `@hookform/resolvers`.
- Inicialización de **shadcn/ui** con la CLI oficial y los componentes base.
- Sistema de diseño documentado: paleta, tipografía, espaciado.
- Router con rutas públicas (login) y rutas protegidas (dashboard y módulos).
- Store de autenticación con Zustand que persiste el JWT en `localStorage`.
- Cliente HTTP (`axios`) con interceptores que inyectan el token y manejan 401 globalmente.
- Layout base con barra de navegación superior y área de contenido.
- Componentes compartidos: tabla paginada, filtros, confirmación, toast de notificaciones, estados vacíos y de error.
- Internacionalización mínima: mensajes de error de backend pasan tal cual (ya vienen en español).

## Alcance que NO se hace en esta fase

- No implementes las 10 pantallas de listados y formularios (Fase G).
- No implementes el wizard de certificado ni la pantalla de reportes (Fase G).
- No escribas tests (Fase H).
- No implementes recuperación de contraseña ni recordar sesión.

## Requisitos técnicos específicos

### Dependencias a agregar

En `frontend/package.json`:

**Producción:**
- `react-router-dom` — routing
- `axios` — cliente HTTP
- `zustand` — estado global mínimo
- `zod` — validación de formularios (client-side)
- `react-hook-form` — manejo de formularios
- `@hookform/resolvers` — integración zod + react-hook-form
- `lucide-react` — iconos
- `class-variance-authority` — variantes de componentes (shadcn/ui)
- `clsx` — composición de clases
- `tailwind-merge` — resolver conflictos de clases de Tailwind
- `date-fns` — manejo de fechas (formateo en español)

**Desarrollo:** nada adicional por ahora.

Instalar con:

```bash
docker compose exec frontend npm install react-router-dom axios zustand zod react-hook-form @hookform/resolvers lucide-react class-variance-authority clsx tailwind-merge date-fns
```

### Inicialización de shadcn/ui

shadcn/ui no es una librería; es un CLI que copia componentes al proyecto. Usa la [guía oficial](https://ui.shadcn.com/docs/installation/vite) para Vite.

Instalación:

```bash
docker compose exec frontend npx shadcn@latest init
```

Responder a los prompts:
- Default style: `New York`
- Base color: `Neutral`
- CSS variables: `Yes`
- Tailwind prefix: ninguno
- Import alias for components: `@/components`
- Import alias for utilities: `@/lib/utils`

Esto creará:
- `frontend/components.json`
- `frontend/src/lib/utils.ts`
- Actualizará `frontend/tailwind.config.js` con plugins y animaciones.
- Actualizará `frontend/src/index.css` con las variables CSS del tema.

Componentes iniciales a instalar (uno por uno con la CLI):

```bash
docker compose exec frontend npx shadcn@latest add button
docker compose exec frontend npx shadcn@latest add input
docker compose exec frontend npx shadcn@latest add label
docker compose exec frontend npx shadcn@latest add card
docker compose exec frontend npx shadcn@latest add table
docker compose exec frontend npx shadcn@latest add dialog
docker compose exec frontend npx shadcn@latest add alert-dialog
docker compose exec frontend npx shadcn@latest add toast
docker compose exec frontend npx shadcn@latest add sonner
docker compose exec frontend npx shadcn@latest add select
docker compose exec frontend npx shadcn@latest add textarea
docker compose exec frontend npx shadcn@latest add badge
docker compose exec frontend npx shadcn@latest add skeleton
docker compose exec frontend npx shadcn@latest add dropdown-menu
docker compose exec frontend npx shadcn@latest add form
docker compose exec frontend npx shadcn@latest add tabs
```

Si algún comando falla por problemas con la terminal interactiva dentro del contenedor, ejecuta los comandos desde el host (con Node.js instalado) en la carpeta `frontend/`.

### Configuración de path aliases

Actualizar `frontend/vite.config.ts` para soportar `@/`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
})
```

Y `frontend/tsconfig.json` debe tener:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Sistema de diseño explícito

#### Tipografía

Agregar en `frontend/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

En `frontend/src/index.css`, configurar Inter como fuente base:

```css
@layer base {
  :root {
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  }
  body {
    font-family: var(--font-sans);
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';  /* mejoras tipográficas de Inter */
  }
}
```

Escala de tipografía (usar clases Tailwind):
- `text-xs` (12px): metadatos, pies de tabla, timestamps
- `text-sm` (14px): texto de tablas, labels, cuerpo secundario
- `text-base` (16px): cuerpo principal, inputs
- `text-lg` (18px): subtítulos de sección
- `text-xl` (20px): títulos de página
- `text-2xl` (24px): valores de KPIs en dashboard
- `text-3xl` (30px): reservado para casos excepcionales

#### Paleta de colores

En `frontend/src/index.css`, override de variables CSS de shadcn/ui para definir la paleta de FHESA. Usa tokens semánticos:

```css
@layer base {
  :root {
    /* Neutros (de shadcn/ui Neutral, mantener) */

    /* FHESA brand */
    --brand-primary: 215 90% 35%;        /* azul institucional */
    --brand-primary-foreground: 0 0% 100%;

    /* Estados semánticos */
    --state-success: 145 63% 42%;        /* dentro de especificación */
    --state-success-foreground: 0 0% 100%;
    --state-warning: 35 100% 50%;        /* alerta, parcial */
    --state-warning-foreground: 0 0% 100%;
    --state-danger: 0 72% 51%;           /* fuera de especificación, error */
    --state-danger-foreground: 0 0% 100%;
    --state-info: 210 100% 50%;          /* información, enlaces */
    --state-info-foreground: 0 0% 100%;
  }
}

@layer utilities {
  .text-success { color: hsl(var(--state-success)); }
  .text-warning { color: hsl(var(--state-warning)); }
  .text-danger { color: hsl(var(--state-danger)); }
  .text-info { color: hsl(var(--state-info)); }
  .bg-success { background-color: hsl(var(--state-success)); }
  .bg-warning { background-color: hsl(var(--state-warning)); }
  .bg-danger { background-color: hsl(var(--state-danger)); }
  .bg-info { background-color: hsl(var(--state-info)); }
}
```

#### Espaciado

Usar la escala de Tailwind directamente:
- `space-y-2` (8px) entre elementos relacionados de una sección.
- `space-y-4` (16px) entre bloques de una misma pantalla.
- `space-y-6` (24px) entre secciones mayores.
- `p-4` para padding de Card y contenedores.
- `p-6` para padding de pantallas completas.

### Estructura de carpetas del frontend

```
frontend/src/
├── main.tsx                          (actualizado)
├── App.tsx                           (reescrito: montar Router)
├── index.css                         (actualizado con paleta)
├── vite-env.d.ts
├── lib/
│   ├── utils.ts                      (creado por shadcn/ui)
│   ├── api.ts                        (nuevo — cliente Axios)
│   ├── auth.ts                       (nuevo — helpers JWT)
│   └── format.ts                     (nuevo — helpers de formato de fechas, números)
├── stores/
│   └── auth.store.ts                 (nuevo — Zustand)
├── types/
│   ├── api.types.ts                  (nuevo — tipos de respuestas API)
│   └── domain.types.ts               (nuevo — tipos de dominio: Usuario, Rol, etc.)
├── components/
│   ├── ui/                           (creado por shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── AppShell.tsx              (nuevo — layout principal)
│   │   ├── TopNav.tsx                (nuevo — barra superior)
│   │   └── UserMenu.tsx              (nuevo — dropdown del usuario)
│   └── shared/
│       ├── DataTable.tsx             (nuevo — tabla paginada reutilizable)
│       ├── ConfirmDialog.tsx         (nuevo — confirmación reutilizable)
│       ├── EmptyState.tsx            (nuevo — estado vacío)
│       ├── ErrorState.tsx            (nuevo — estado de error)
│       ├── LoadingState.tsx          (nuevo — loading con skeleton)
│       ├── StatusBadge.tsx           (nuevo — badge coloreado por estado)
│       └── PageHeader.tsx            (nuevo — encabezado de página)
├── routes/
│   ├── AppRoutes.tsx                 (nuevo — definición de rutas)
│   ├── ProtectedRoute.tsx            (nuevo — guardia de autenticación)
│   └── RoleRoute.tsx                 (nuevo — guardia de rol)
├── pages/
│   ├── Login.tsx                     (nuevo — pantalla de login real)
│   ├── Dashboard.tsx                 (placeholder en esta fase)
│   ├── Equipos.tsx                   (placeholder)
│   ├── Clientes.tsx                  (placeholder)
│   ├── Inspecciones.tsx              (placeholder)
│   ├── Certificados.tsx              (placeholder)
│   ├── Reportes.tsx                  (placeholder)
│   └── NotFound.tsx                  (nuevo — 404)
└── hooks/
    ├── useAuth.ts                    (nuevo — acceso al store)
    ├── useApi.ts                     (nuevo — queries y mutations simples)
    └── useDebounce.ts                (nuevo — para búsquedas)
```

### Contenido clave de cada archivo

#### `frontend/src/lib/api.ts`

Cliente Axios con:
- `baseURL` desde `import.meta.env.VITE_API_BASE_URL` (que ya está en `.env.example`).
- Interceptor de request: si hay token en el store de auth, agregar `Authorization: Bearer <token>`.
- Interceptor de response: si 401, limpiar store de auth y redirigir a `/login` (excepto si la request era a `/auth/login`).
- Helper `handleApiError(err)` que extrae el mensaje del formato RFC 9457 del backend (`err.response.data.error.mensaje`) y lo retorna como string; si no es formato estándar, retorna mensaje genérico.

#### `frontend/src/stores/auth.store.ts`

Zustand store con persist middleware (para `localStorage`):

```typescript
interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  setAuth: (token: string, usuario: Usuario) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
  hasRole: (roles: Rol[]) => boolean;
}
```

Usar `persist` de `zustand/middleware`. Nombre del storage: `fhesa-auth`.

#### `frontend/src/routes/ProtectedRoute.tsx`

Componente que verifica autenticación. Si no está autenticado, redirige a `/login` con `state: { from: location }` para regresar después del login.

#### `frontend/src/routes/RoleRoute.tsx`

Componente que verifica rol. Si no tiene el rol requerido, redirige a `/dashboard` (o muestra mensaje de "Sin permisos").

#### `frontend/src/routes/AppRoutes.tsx`

Router:

```
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/equipos" element={<Equipos />} />
    <Route path="/clientes" element={<Clientes />} />
    <Route path="/inspecciones" element={<Inspecciones />} />
    <Route path="/certificados" element={<Certificados />} />
    <Route path="/reportes" element={<Reportes />} />
  </Route>
  <Route path="*" element={<NotFound />} />
</Routes>
```

#### `frontend/src/pages/Login.tsx`

Formulario con:
- Campos `correo` y `password` con `react-hook-form` + resolver de Zod.
- Botón "Iniciar sesión" con estado de loading.
- Al éxito: guardar en store, navegar a la ruta de origen (desde `location.state.from`) o a `/dashboard`.
- Al error: mostrar toast con el mensaje del backend.
- Estilo: centrado vertical y horizontal, card de ~400px de ancho, logo y nombre "FHESA" arriba.

#### `frontend/src/components/layout/AppShell.tsx`

Layout con:
- `<TopNav />` arriba.
- `<main>` con padding y `<Outlet />` de React Router.
- `<Toaster />` de sonner para notificaciones.

#### `frontend/src/components/layout/TopNav.tsx`

Barra superior con:
- Logo "FHESA" a la izquierda.
- Links a Dashboard, Equipos, Clientes, Inspecciones, Certificados, Reportes. El link activo se resalta.
- `<UserMenu />` a la derecha.

Ocultar links para los que el usuario no tiene permiso (ej. LABORATORIO no ve "Reportes" si solo vemos a ese rol con permiso, pero según la regla de negocio todos los autenticados ven reportes; solo las escrituras están restringidas). Mantén todos los links visibles.

#### `frontend/src/components/layout/UserMenu.tsx`

Dropdown con el nombre del usuario y opciones:
- Mi perfil (placeholder, no funcional en esta fase).
- Cerrar sesión (limpia store y redirige a `/login`).

#### `frontend/src/components/shared/DataTable.tsx`

Tabla reutilizable con:
- Props: `columns: { key, header, render? }[]`, `data: T[]`, `pagination?: { page, limit, total, onPageChange }`, `emptyMessage?: string`, `loading?: boolean`.
- Si `loading`, mostrar skeleton rows.
- Si `!loading && data.length === 0`, mostrar `<EmptyState />`.
- Footer con paginación: botones anterior/siguiente y "Mostrando X-Y de Z".

#### `frontend/src/components/shared/StatusBadge.tsx`

Badge coloreado según estado. Mapa:
- `ACTIVO`, `ENVIADO`, `CERRADA` → verde
- `INACTIVO`, `ENVIO_PARCIAL`, `BORRADOR` → naranja
- `BAJA`, `FALLIDO` → rojo

#### `frontend/src/components/shared/PageHeader.tsx`

Encabezado estándar con:
- Título grande (`text-xl font-semibold`).
- Breadcrumb opcional arriba.
- Slot para acciones a la derecha (botones).

#### `frontend/src/lib/format.ts`

Helpers para:
- `formatFecha(iso: string)` → "16 abr 2026" (usar `date-fns` con locale `es`).
- `formatFechaHora(iso: string)` → "16 abr 2026, 14:30".
- `formatNumero(valor: number, decimales?: number)` → "1,234.56".
- `formatPorcentaje(valor: number)` → "96.8%".

#### `frontend/src/pages/Dashboard.tsx` (placeholder)

Muestra "Bienvenido, <nombre>" con un texto de placeholder. En la Fase G se convertirá en el dashboard real con KPIs.

Los demás `pages/*.tsx` son placeholders similares con el título correspondiente.

### Variables de entorno

`frontend/.env.example` debe contener:

```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Copia a `frontend/.env` si no existe.

## Procedimiento sugerido (bloques con confirmación)

### Bloque 1 — Verificación y dependencias

1. Verifica que `frontend/` existe y la página placeholder carga en `http://localhost:5173`.
2. Instala todas las dependencias listadas arriba.
3. Reinicia el servicio frontend: `docker compose restart frontend`.

### Bloque 2 — shadcn/ui

1. Ejecuta `npx shadcn@latest init` dentro del contenedor frontend o desde el host.
2. Instala los 16 componentes listados.
3. Verifica que `frontend/src/components/ui/` tiene los archivos.

### Bloque 3 — Config y aliases

1. Actualiza `vite.config.ts` con el alias `@/`.
2. Actualiza `tsconfig.json` con el `paths`.
3. Verifica que `docker compose exec frontend npx tsc --noEmit` pasa.

### Bloque 4 — Sistema de diseño

1. Agrega preconnect y link de Inter en `index.html`.
2. Actualiza `index.css` con variables de color semánticas y clases utilitarias.
3. Configura `tailwind.config.js` si es necesario para reconocer las nuevas variables.

### Bloque 5 — Infraestructura de capa de datos

Crea:
- `frontend/src/types/domain.types.ts` — tipos Usuario, Rol, Equipo, Cliente, etc. (espejando el dominio).
- `frontend/src/types/api.types.ts` — tipos de respuestas envolventes (PaginatedResponse<T>, ErrorResponse).
- `frontend/src/lib/api.ts` — cliente Axios con interceptores.
- `frontend/src/lib/auth.ts` — helpers simples (isTokenExpired, etc.).
- `frontend/src/stores/auth.store.ts` — Zustand store.
- `frontend/src/hooks/useAuth.ts`.
- `frontend/src/hooks/useDebounce.ts`.
- `frontend/src/lib/format.ts`.

### Bloque 6 — Routing

Crea:
- `frontend/src/routes/AppRoutes.tsx`.
- `frontend/src/routes/ProtectedRoute.tsx`.
- `frontend/src/routes/RoleRoute.tsx`.
- Placeholders de pages: `Login`, `Dashboard`, `Equipos`, `Clientes`, `Inspecciones`, `Certificados`, `Reportes`, `NotFound`.

Actualiza `App.tsx` para montar el `<AppRoutes />` dentro de `<BrowserRouter>`.

### Bloque 7 — Layout y componentes compartidos

Crea:
- `frontend/src/components/layout/AppShell.tsx`.
- `frontend/src/components/layout/TopNav.tsx`.
- `frontend/src/components/layout/UserMenu.tsx`.
- `frontend/src/components/shared/DataTable.tsx`.
- `frontend/src/components/shared/ConfirmDialog.tsx`.
- `frontend/src/components/shared/EmptyState.tsx`.
- `frontend/src/components/shared/ErrorState.tsx`.
- `frontend/src/components/shared/LoadingState.tsx`.
- `frontend/src/components/shared/StatusBadge.tsx`.
- `frontend/src/components/shared/PageHeader.tsx`.

### Bloque 8 — Pantalla de Login

Implementa `frontend/src/pages/Login.tsx` completo con:
- react-hook-form + zod.
- Conexión real al endpoint `/auth/login`.
- Manejo de errores con toast.
- Redirect post-login.

### Bloque 9 — Pruebas manuales end-to-end

1. Abre `http://localhost:5173`.
2. Debes ver la pantalla de Login.
3. Intenta login con credenciales inválidas → debes ver toast de error.
4. Login con `control@fhesa.mx` / `fhesa123` → debes ser redirigido a `/dashboard` y ver la barra superior con tu nombre.
5. Click en cada link del nav; cada página placeholder debe cargar con su título.
6. Abre DevTools → Application → Local Storage. Debe haber una entrada `fhesa-auth` con el token y el usuario.
7. Click en "Cerrar sesión" → debes ser redirigido a `/login`, y el `localStorage` queda limpio.
8. Intenta acceder directo a `http://localhost:5173/dashboard` sin estar autenticado → debe redirigir a `/login`.
9. Verifica que refrescar la página (F5) mantiene la sesión (gracias al persist).
10. Abre DevTools → Network, haz una acción que dispare una petición, verifica que el header `Authorization: Bearer ...` se envía.

### Bloque 10 — Cierre

1. Verifica que `docker compose exec frontend npx tsc --noEmit` pasa sin errores.
2. Verifica que `docker compose logs frontend` no muestra errores ni warnings inesperados.
3. Reporta al humano:
   - Archivos creados.
   - Resultado de las 10 pruebas end-to-end.
   - Cualquier advertencia residual.
4. Sugiere commit: `feat: add frontend core, routing, auth and design system (Phase F)`.

## Criterios de éxito de la Fase F

- [ ] Compilación TypeScript sin errores en el frontend.
- [ ] Pantalla de login funcional con validación client-side y mensajes de error del backend.
- [ ] JWT persistido en localStorage y reenvíado automáticamente.
- [ ] 401 del backend → redirect automático a login.
- [ ] Layout con TopNav se muestra en todas las rutas protegidas.
- [ ] Navegación entre páginas placeholder funciona.
- [ ] Cerrar sesión limpia el estado.
- [ ] Inter cargada y aplicada como fuente base.
- [ ] 16 componentes de shadcn/ui instalados.
- [ ] Path alias `@/` funciona.

## Si algo falla

- Si shadcn/ui CLI no corre interactivamente en el contenedor, ejecútalo desde el host con `cd frontend && npx shadcn@latest init`.
- Si Vite no recarga por cambios, verifica que `server.watch.usePolling: true` esté en `vite.config.ts`.
- Si aparecen errores de CORS, verifica que `CORS_ORIGIN` en `backend/.env` apunta a `http://localhost:5173`.
- Si el JWT se pierde al refrescar, verifica la configuración de `persist` en el store.

## Entregables

Archivos creados (~30) en `frontend/src/`. Ver árbol de estructura en la sección de requisitos.