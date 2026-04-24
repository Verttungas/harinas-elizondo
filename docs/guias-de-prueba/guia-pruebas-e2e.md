# Guía de Pruebas End-to-End (E2E)

## 1. Objetivo

Verificar los **flujos críticos del usuario** completos, desde el navegador hasta la base de datos y el servidor de correo, simulando el uso real del sistema. Una prueba E2E exitosa confirma que todas las piezas (frontend + backend + BD + MailHog) están correctamente integradas.

## 2. Alcance

Tres flujos obligatorios, uno por cada actor principal:

1. **Autenticación (UC-00)** — `auth.spec.ts`: login exitoso, logout, credenciales inválidas, redirección sin sesión.
2. **Crear equipo de laboratorio (UC-01)** — `equipos.spec.ts`: listar equipos del seed, crear un equipo nuevo con un parámetro completo.
3. **Emitir certificado end-to-end (UC-12)** — `certificados.spec.ts`: wizard de 4 pasos (cliente → lote → embarque → revisión) y verificación final de que MailHog recibió el correo con asunto "Certificado …".

Estas pruebas **no** cubren detalles de UI (modales, estados de carga), los cuales se verifican durante las pruebas de aceptación del usuario (UAT).

## 3. Herramienta

[Playwright](https://playwright.dev) 1.x con navegador Chromium. Configurado en `frontend/playwright.config.ts`:

```ts
fullyParallel: false,     // secuencial para no pelearse con el seed compartido
workers: 1,
baseURL: "http://localhost:5173",
reporter: [["list"], ["html"]],
```

Por defecto la `baseURL` es `http://localhost:5173`; se puede sobrescribir con la variable de entorno `PLAYWRIGHT_BASE_URL` al correr desde un host remoto.

## 4. Prerrequisitos

- `docker compose up -d` levanta los cuatro servicios (backend, frontend, database, mailhog).
- La base de datos de desarrollo tiene aplicado el seed (`npx prisma db seed`).
- El usuario `control@fhesa.mx` / `fhesa123` existe (viene en el seed).

> **Nota:** Chromium oficial de Playwright no soporta Alpine Linux. El contenedor `frontend` usa `node:22-alpine`, por lo que `npx playwright install` no puede correr dentro del contenedor. Las opciones prácticas son:
>
> **(a)** Ejecutar Playwright desde el **host** (recomendado). El host accede al frontend vía `http://localhost:5173`.
>
> **(b)** Usar un contenedor oficial de Playwright (`mcr.microsoft.com/playwright`) en modo puntual:
> ```bash
> docker run --rm --network host -v "$PWD/frontend:/work" -w /work \
>   mcr.microsoft.com/playwright:v1.59.1 \
>   sh -c "npm ci && npx playwright test"
> ```

## 5. Estructura de archivos

```
frontend/
├── playwright.config.ts
├── tests/
│   ├── tsconfig.json                 # config TS para Playwright
│   └── e2e/
│       ├── helpers/
│       │   └── auth.ts               # loginAs(page) — reutilizable
│       ├── auth.spec.ts
│       ├── equipos.spec.ts
│       └── certificados.spec.ts
```

## 6. Cómo ejecutar

**Desde el host** (recomendado):

```bash
cd frontend
npm install
npx playwright install --with-deps chromium

# Correr toda la suite
npm run test:e2e

# Modo interactivo (con UI mode — el más útil al desarrollar)
npm run test:e2e:ui

# Ver el reporte HTML de la última corrida
npm run test:e2e:report
```

**Desde el contenedor oficial de Playwright**:

```bash
docker run --rm --network host -v "$PWD/frontend:/work" -w /work \
  mcr.microsoft.com/playwright:v1.59.1 \
  sh -c "npm ci && npx playwright test"
```

## 7. Cómo interpretar los resultados

- Salida `list`: cada test aparece en una línea con ✓ / ✗.
- Tests fallidos generan:
  - Una **captura de pantalla** (`test-results/<test>/test-failed-1.png`)
  - Un **video** (`retain-on-failure`)
  - Un **trace.zip** que puede abrirse con `npx playwright show-trace trace.zip` para reproducir la ejecución paso a paso.
- El reporte HTML (`playwright-report/index.html`) agrupa todos los artefactos y permite ver los steps del test con sus screenshots.

## 8. Flujos cubiertos

### UC-00 — Autenticación (`auth.spec.ts`)

| Test | Resultado esperado |
|---|---|
| Login exitoso + logout | Redirige a `/dashboard`, muestra nombre del usuario, luego regresa a `/login` al hacer logout |
| Credenciales inválidas | Mensaje que contiene "credenciales" permanece en `/login` |
| Acceso sin sesión a ruta protegida | Redirige a `/login` |
| Formulario con campos vacíos | Muestra errores de validación del formulario |

### UC-01 — Crear equipo (`equipos.spec.ts`)

| Test | Resultado esperado |
|---|---|
| Lista equipos del seed | Visible `ALV-001` o `FAR-001` en la tabla |
| Crear equipo con un parámetro | Dialog de parámetro → `Crear` → redirige al listado y aparece la clave nueva |

### UC-12 — Emitir certificado (`certificados.spec.ts`)

| Test | Resultado esperado |
|---|---|
| Wizard de 4 pasos termina en certificado emitido | Aparece número `CERT-2026-NNNNNN` |
| MailHog recibe correos | `GET /api/v2/messages` devuelve al menos un item con asunto que contiene "Certificado" |

## 9. Troubleshooting

- **"Timeout waiting for selector"**: el frontend puede estar tardando en arrancar. Verifica `curl http://localhost:5173` desde el host.
- **"ECONNREFUSED 127.0.0.1:3000"**: el backend no está expuesto al host. Revisa que `ports: [3000:3000]` exista en `compose.yaml`.
- **Tests flaky por el dropdown de Radix**: los componentes de shadcn/ui usan Radix Primitives; al abrir un dropdown, el contenido se monta en un portal. Las aserciones sobre el contenido deben usar `page.locator(...)` global (no dentro del trigger).
