# Plan de acción — Cierre QA FHESA

> **Documento vivo.** Léelo al inicio de cada sesión de Claude Code y actualiza el estado de los hitos a medida que se completan. Es el complemento ejecutivo de `qa-hallazgos.md`.

**Fecha de creación:** 2026-04-30
**Fuente de hallazgos:** [`qa-hallazgos.md`](qa-hallazgos.md) (sesión UAT del 2026-04-29)
**Entrega final:** 2026-05-01
**Repo en sincronía con `origin/main` al iniciar:** commit `4991585`

---

## Estado consolidado al 2026-04-30 18:30

**Sesión de implementación 2026-04-30.** Bloqueantes cerrados, no-bloqueantes (excepto H-3.8) cerrados. Pendiente UAT manual + correr suite de tests + commits/PRs.

### Resumen ejecutivo de cambios

| Hito | Severidad | Estado | Demo en |
|------|-----------|--------|---------|
| H-1.1 RBAC frontend | Bloqueante | ✅ Hecho | TopNav, Dashboard, intentar `/clientes/nuevo` con rol distinto a CC |
| H-1.2 Pantalla detalle de lote | Bloqueante | ✅ Hecho | Click en ojo desde `/lotes` |
| H-1.3 Control de inventario por lote | Bloqueante | ✅ Hecho | Wizard de certificado paso 3 + LoteDetalle |
| H-2.1 Bug 4 PDF (desviación rango cliente) | Bloqueante | ✅ Hecho | Descargar PDF de un cert con cliente que tiene VR particulares |
| H-3.1 Bugs 1, 2, 3 PDF (cosméticos) | No-bloqueante | ✅ Hecho | Descargar cualquier PDF — Unidad y Parámetro no se parten |
| H-3.2 Atajo "Crear lote" en modal | No-bloqueante | ✅ Hecho | InspeccionForm → botón "Crear lote" |
| H-3.3 Icono y label "Generar ficticia" | No-bloqueante | ✅ Hecho | CertificadoDetalle |
| H-3.4 Botón Reenviar en detalle | No-bloqueante | ✅ Hecho (existía) | CertificadoDetalle con texto cuando no aplica |
| H-3.5 Etiqueta "Estado (rango internacional)" | No-bloqueante | ✅ Hecho | InspeccionForm tabla de resultados |
| H-3.6 Autocomplete de lote | No-bloqueante | ✅ Hecho | InspeccionForm campo "Número de lote" |
| H-3.7 Acordeón de equipos | No-bloqueante | ✅ Hecho | InspeccionForm sección Resultados |
| H-3.8 Dashboard diferenciado por rol | No-bloqueante | ⏸ Diferido | post-presentación (entrega movida a la siguiente semana) |

### Archivos creados o modificados

**Frontend:**
- `frontend/src/lib/rbac.ts` (nuevo) — mapa rol→rutas y constantes `rolesEscritura*`
- `frontend/src/components/layout/TopNav.tsx` — filtra `navItems` por rol
- `frontend/src/routes/AppRoutes.tsx` — envuelve rutas de escritura con `<RoleRoute>`
- `frontend/src/pages/Dashboard.tsx` — oculta acciones rápidas según rol
- `frontend/src/pages/lotes/LotesListado.tsx` · `EquiposListado.tsx` · `ClientesListado.tsx` · `inspecciones/InspeccionesListado.tsx` — consumen constantes RBAC
- `frontend/src/pages/lotes/LoteDetalle.tsx` — timeline A–Z, certificados, inventario
- `frontend/src/pages/certificados/wizard/PasoEmbarque.tsx` — saldo del lote, bloqueo de submit
- `frontend/src/pages/certificados/wizard/WizardCertificado.tsx` — pasa `loteId` al paso 3
- `frontend/src/pages/certificados/CertificadoDetalle.tsx` — `<GitFork />`, texto explicativo, mensaje de envíos exitosos
- `frontend/src/pages/inspecciones/InspeccionForm.tsx` — autocomplete, modal Crear lote, acordeón, header "Estado (rango internacional)"
- `frontend/src/components/lotes/CrearLoteDialog.tsx` (nuevo) — modal embebido
- `frontend/src/types/domain.types.ts` — tipo `SaldoLote`

**Backend:**
- `backend/src/modules/lotes/lotes.service.ts` — método `getSaldo()`
- `backend/src/modules/lotes/lotes.controller.ts` — handler `getLoteSaldo`
- `backend/src/modules/lotes/lotes.routes.ts` — ruta `GET /lotes/:id/saldo`
- `backend/src/modules/certificados/certificados.service.ts` — validación de saldo dentro del `$transaction`
- `backend/src/modules/certificados/pdf.service.ts` — fix desviación + sanitizador Unicode + anchos rebalanceados + función pura `consolidarResultados()`

**Tests:**
- `backend/tests/integration/certificados.test.ts` — bloque "Control de inventario por lote" (1000 → 500 OK → 600 rechazado)
- `backend/tests/unit/modules/certificados/pdf.consolidacion.test.ts` (nuevo) — 4 casos de desviación con/sin rango cliente

### Cómo verificar (15 min de revisión)

Stack arriba: `docker compose ps` debe mostrar 4 contenedores `Up`. Si no, `docker compose up -d`.

URLs:
- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1
- MailHog: http://localhost:8025
- DB studio (opcional): `docker compose exec backend npx prisma studio --port 5555 --browser none`

Usuarios sembrados (todos con la misma password — ver `prisma/seed.ts`):
- `lab@fhesa.mx` — LABORATORIO
- `control@fhesa.mx` — CONTROL_CALIDAD
- `calidad@fhesa.mx` — ASEGURAMIENTO_CALIDAD
- `gerente@fhesa.mx` — GERENTE_PLANTA
- `director@fhesa.mx` — DIRECTOR_OPERACIONES

**Checklist de revisión:**

1. **RBAC TopNav (H-1.1)** — Login como `lab@`. TopNav debe mostrar sólo Dashboard, Lotes, Inspecciones, Certificados, Reportes (no Equipos, no Clientes). Logout y login como `gerente@` → solo Dashboard, Certificados, Reportes. Login como `control@` → todos los ítems.
2. **RBAC URLs directas (H-1.1)** — Como `lab@`, navegar a `http://localhost:5173/clientes/nuevo` por URL → debe rebotar a `/dashboard` antes de renderizar el form.
3. **Dashboard CTAs (H-1.1)** — Como `gerente@` el bloque "Acciones rápidas" no aparece. Como `lab@` aparece pero sin "Nuevo cliente".
4. **Detalle de lote (H-1.2)** — Como cualquier rol: `/lotes` → click en el ojo de un lote → ver tarjeta de info, **inventario** (producida/entregada/disponible), timeline de inspecciones A–Z y lista de certificados. Antes era 404.
5. **Saldo de lote (H-1.3)** — Como `control@`, emitir un certificado sobre un lote pequeño (ej. `AYUDA` con 100 kg). En el wizard paso 3 verás el panel de saldo; si pones cantidad > disponible, el botón Siguiente se deshabilita con tooltip.
6. **PDF desviación (H-2.1)** — Descargar el PDF de un certificado existente. La columna "Desviación" debe corresponder al rango aplicable (cliente o internacional, ver sufijo "(C)"); ya no salen valores negativos absurdos cuando aplica rango cliente.
7. **PDF cosméticos (H-3.1)** — En el mismo PDF, "Unidad" como `adimensional` o `x10⁻⁴ J` ya no se parte; superscripts se renderizan como `^4`, `^-4`.
8. **InspeccionForm UX (H-3.2/3.5/3.6/3.7)** — `/inspecciones/nueva`:
   - Escribe el inicio de un número de lote → dropdown de sugerencias.
   - Click "Crear lote" → modal embebido.
   - Sección Resultados: cada equipo colapsado por default; chevron + contador "0/N parámetros capturados".
   - Header de tabla "Estado (rango internacional)" con icono Info al pasar mouse.
9. **Generar ficticia (H-3.3)** — `/certificados/<id>` → texto explicativo arriba de "Inspecciones incluidas"; botón con icono GitFork + label visible.
10. **Reenviar (H-3.4)** — Si todos los envíos están en ENVIADO, aparece el texto "Todos los envíos fueron exitosos — no hay nada que reintentar."

---

## Cómo usar este documento

1. Abre Claude Code en la raíz del repo.
2. Pídele: *"Lee `qa-plan-accion.md` y continúa con el primer hito que tenga estado `Pendiente` o `En progreso`."*
3. Al terminar un hito, actualiza:
   - Su `Estado` (`Pendiente` → `En progreso` → `Hecho` / `Bloqueado` / `Descartado`).
   - La sección **Bitácora** al final con una línea fechada.
4. Si un hito se descarta o se degrada, anota el motivo en su bloque.

### Leyenda de estados

| Estado | Símbolo | Significado |
|--------|---------|-------------|
| Pendiente | `[ ]` | No iniciado |
| En progreso | `[~]` | En curso (ver bitácora) |
| Hecho | `[x]` | Completado y verificado |
| Bloqueado | `[!]` | Esperando algo (anotar dependencia) |
| Descartado | `[-]` | No se va a hacer (anotar motivo) |

---

## Resumen de hallazgos

13 hallazgos. **5 bloqueantes** (no negociables para entrega), 8 no-bloqueantes.

| ID | Severidad | Hito que lo cubre |
|----|-----------|--------------------|
| Obs-001 | No-bloqueante | H-3.6 |
| Obs-002 | No-bloqueante | H-3.7 |
| Obs-003 | Bloqueante | H-1.2 |
| Obs-004 | No-bloqueante | H-3.5 |
| Obs-005 | No-bloqueante | H-3.2 |
| Obs-006 | Bloqueante | H-1.3 |
| Obs-007 | No-bloqueante (bug 4 alta prioridad) | H-2.1 (bug 4) + H-3.1 (1, 2, 3) |
| Obs-008 | Bloqueante | H-1.1 |
| Obs-009 | No-bloqueante | H-3.3 |
| Obs-010 | No-bloqueante | H-1.1 (parcial) + H-3.8 (deuda) |
| Obs-011 | No-bloqueante | H-3.4 |
| Obs-012 | Bloqueante | H-1.1 |
| Obs-013 | Bloqueante | H-1.1 |

> **Insight clave:** Obs-008, Obs-010 (parcial), Obs-012 y Obs-013 comparten causa raíz (RBAC frontend ausente). Se cierran con un único PR coordinado en H-1.1.

---

## Fase 1 — Bloqueantes (no negociables)

### H-1.1 — Cluster RBAC frontend

**Estado:** `[x]` Hecho (pendiente UAT manual)
**Cubre:** Obs-008, Obs-012, Obs-013, parte de Obs-010
**Estimación:** 0.5 día · **Dueño sugerido:** Frontend lead

**Contexto.** El backend ya protege escrituras con `requireRole(...)`. El frontend no usa `<RoleRoute>` ni filtra `TopNav`. Resultado: cualquier rol llega a formularios privilegiados y recibe 403 al final. El componente `RoleRoute` ya existe (`frontend/src/routes/RoleRoute.tsx`) pero no se usa. Patrón funcional ya aplicado en `InspeccionesListado.tsx` y en `CertificadoDetalle.tsx:23` — replicarlo.

**Pasos.**

- [x] Crear mapa `RolUsuario → rutasPermitidas[]` y filtrar `navItems` en `frontend/src/components/layout/TopNav.tsx:5` → centralizado en `frontend/src/lib/rbac.ts`
- [x] Envolver con `<RoleRoute roles={...}>` en `frontend/src/routes/AppRoutes.tsx`:
  - `/clientes/nuevo`, `/clientes/:id/editar` → `CONTROL_CALIDAD`
  - `/lotes/nuevo` → `CONTROL_CALIDAD` + `LABORATORIO` (verificado contra `backend/src/modules/lotes/lotes.routes.ts:32`)
  - `/equipos/nuevo`, `/equipos/:id/editar` → `CONTROL_CALIDAD`
  - `/certificados/nuevo` → `CONTROL_CALIDAD`
  - `/inspecciones/nueva`, `/inspecciones/:id/editar` → `CONTROL_CALIDAD` + `LABORATORIO`
- [x] Filtrar "Acciones rápidas" del `frontend/src/pages/Dashboard.tsx` por rol (oculta CTAs de escritura para roles de lectura)
- [x] Replicar gating de "Nuevo" en listados: refactor `LotesListado.tsx`, `EquiposListado.tsx`, `ClientesListado.tsx`, `InspeccionesListado.tsx` para consumir constantes `rolesEscritura*` desde `lib/rbac.ts`

**Criterios de aceptación.**

- Login con `lab@`, `gerente@`, `director@`, `calidad@` no muestra ítems de TopNav privilegiados.
- Navegación directa por URL a `/clientes/nuevo`, `/lotes/nuevo`, `/equipos/nuevo` rebota a `/dashboard` (o pantalla "no autorizado") **antes** de renderizar el form.
- Login como `cc@` mantiene acceso completo.

**Archivos clave.**

- `frontend/src/components/layout/TopNav.tsx:5`
- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/routes/RoleRoute.tsx` (existente, reutilizar)
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/lotes/LotesListado.tsx`
- `frontend/src/pages/equipos/EquiposListado.tsx`
- `frontend/src/pages/clientes/ClientesListado.tsx`
- Patrón de referencia: `frontend/src/pages/inspecciones/InspeccionesListado.tsx`, `frontend/src/pages/certificados/CertificadoDetalle.tsx:23`

---

### H-1.2 — Pantalla detalle de lote

**Estado:** `[x]` Hecho (pendiente UAT manual; saldo se agrega en H-1.3)
**Cubre:** Obs-003
**Estimación:** 0.5 día · **Dueño sugerido:** Frontend 2

**Contexto.** El botón de ojo en `/lotes` navega a `/lotes/:id`, ruta no registrada → 404. Rompe UC-11 (Ver secuencia A-Z de un lote). Backend ya tiene `GET /lotes/:id`.

**Pasos.**

- [x] Crear `frontend/src/pages/lotes/LoteDetalle.tsx` con:
  - Datos del lote (producto, fecha, cantidad producida)
  - Línea de tiempo de inspecciones (letra A–Z + estado: BORRADOR / CERRADA / Ficticia + indicador de inspección origen para ficticias)
  - Listado de certificados emitidos sobre el lote (numero, cliente, fecha, estado; navega a detalle)
  - **Bonus:** indicador de saldo → diferido a H-1.3 (depende del nuevo `GET /lotes/:id/saldo`)
- [x] Registrar `<Route path="/lotes/:id" element={<LoteDetalle />} />` en `frontend/src/routes/AppRoutes.tsx`
- [x] Verificar que el botón de ojo en `frontend/src/pages/lotes/LotesListado.tsx:72` apunta correctamente

**Plan B (si no alcanza el tiempo).** Retirar el botón de ojo de `LotesListado.tsx:72` para evitar 404. No es ideal pero es honesto.

**Criterios de aceptación.**

- Click en ojo desde `/lotes` carga la pantalla de detalle (no 404).
- Si hay inspecciones, se muestran ordenadas por letra de la serie A-Z.
- Si hay certificados emitidos sobre el lote, aparecen listados con su número y estado.

**Archivos clave.**

- `frontend/src/pages/lotes/LotesListado.tsx:72`
- `frontend/src/routes/AppRoutes.tsx:44`

---

### H-1.3 — Control de inventario por lote

**Estado:** `[x]` Hecho (pendiente correr `./run-tests.sh` y UAT manual)
**Cubre:** Obs-006
**Estimación:** 1 día · **Dueño sugerido:** Backend 1 + Frontend (parcial)

**Contexto.** `cantidadEntrega` se valida sólo contra `cantidadSolicitada` del propio certificado, nunca contra la suma de entregas previas del mismo lote. Posible sobreentrega: dos clientes pueden recibir certificados que sumen más harina que la producida.

**Pasos.**

- [x] **Backend.** En `backend/src/modules/certificados/certificados.service.ts` validación dentro del `$transaction` (consistencia ante concurrencia):

  ```
  saldoLote = cantidadProducida - SUM(cantidadEntrega de certificados del mismo lote)
  if (cantidadEntrega > saldoLote) → 422 LOTE_SALDO_INSUFICIENTE
  ```

  Si el lote no tiene `cantidadProducida` registrada, la validación se omite (back-compat).
- [x] **Backend.** Nuevo endpoint `GET /lotes/:id/saldo` → `{ loteId, producida, entregada, disponible, unidadCantidad }` (Decimal serializados como string).
- [x] **Frontend.** `frontend/src/pages/certificados/wizard/PasoEmbarque.tsx`:
  - Recibe `loteId` desde el wizard y consume `GET /lotes/:id/saldo`
  - Muestra panel con producida / entregada / disponible arriba del form
  - Resalta panel en rojo si `cantidadEntrega > disponible` y deshabilita el botón Siguiente con tooltip
- [x] **Test de integración.** `backend/tests/integration/certificados.test.ts` — bloque "Control de inventario por lote": lote 1000 kg → cert 500 kg OK → cert 600 kg → 422 con `LOTE_SALDO_INSUFICIENTE`; saldo refleja 500 kg disponible al final.
- [x] **Bonus.** Tarjeta de "Inventario del lote" agregada a `LoteDetalle.tsx`.

**Criterios de aceptación.**

- Reproducción del Obs-006 (1000 kg producidos, 500 + 600) → segundo certificado rechazado con error 422 explicando el saldo.
- Si la inspección original ya consumió todo el lote, el botón "Emitir" se deshabilita en el wizard con tooltip explicativo.

**Archivos clave.**

- `backend/prisma/schema.prisma:305` (sin restricción a nivel BD)
- `backend/src/modules/certificados/certificados.service.ts`
- `backend/src/modules/lotes/lotes.routes.ts` (nuevo endpoint)
- `frontend/src/pages/certificados/wizard/PasoEmbarque.tsx:25`

---

## Fase 2 — Bug crítico del PDF

### H-2.1 — Bug 4 PDF: desviación contra rango cliente

**Estado:** `[x]` Hecho (pendiente correr suite de tests)
**Cubre:** Obs-007 bug 4 (el de mayor severidad de los cuatro)
**Estimación:** 2 h · **Dueño sugerido:** Backend 1

**Contexto.** Cuando aplica el rango del cliente (sufijo "(C)" en la tabla), la `desviacion` mostrada se calcula contra el midpoint del rango **internacional**, no del cliente. Esto comunica un número falso al cliente.

Ejemplo: valor 220, rango cliente 201–220, internacional 200–350.

- Correcto vs. cliente: `220 - 210.5 = +9.5`
- PDF muestra: `220 - 275 = -55`

**Pasos.**

- [x] En `backend/src/modules/certificados/pdf.service.ts` recalcular `desviacion` localmente:

  ```
  rango = rangoClienteAplica ? rangoCliente : rangoInternacional
  desviacion = valor - midpoint(rango.min, rango.max)
  ```

  En lugar de leer `r.desviacion` precalculado en el modelo (que asume internacional).
- [x] Refactor: lógica de consolidación extraída a la función pura exportada `consolidarResultados()` para facilitar testing.
- [x] Test unitario `tests/unit/modules/certificados/pdf.consolidacion.test.ts`: cubre el caso del ejemplo (220 con rango cliente 201–220 → +9.5; 220 con rango internacional 200–350 → -55), sobrescritura por inspección ficticia y caso fuera-de-rango cliente.

**Criterios de aceptación.**

- Caso del ejemplo (220 con rango cliente 201–220) → PDF imprime `+9.5` (no `-55`).
- Cuando no hay rango cliente, el comportamiento previo se conserva.

**Archivos clave.**

- `backend/src/modules/certificados/pdf.service.ts:104-145`

---

## Fase 3 — Mejoras no-bloqueantes (oportunista, por valor/costo)

### H-3.1 — Bugs 1, 2, 3 del PDF

**Estado:** `[x]` Hecho
**Cubre:** Obs-007 bugs 1, 2, 3
**Estimación:** 1.5 h

**Pasos.**

- [x] Bug 1: nuevo helper `sanitizarParaHelvetica()` reemplaza superscripts/subscripts (⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺) por equivalentes ASCII (`^0`…`^9`, `-`, `+`). Se aplica a `claveParametro` y `unidadMedida` antes de renderizar (mantener PDF sin embedding de fuentes externas).
- [x] Bug 2: anchos rebalanceados (`[70, 90, 55, 105, 60, 80]`); celdas con `lineBreak: false` + `ellipsis: true` para que el texto respete el ancho de columna en lugar de fluir a la siguiente línea o desbordarse.
- [x] Bug 3: columna Unidad ampliada de 55 → 90 px y con `lineBreak: false`, así "adimensional" cabe completo sin partirse.

**Archivos clave.** `backend/src/modules/certificados/pdf.service.ts:104-145`

---

### H-3.2 — Atajo "Crear lote" en modal

**Estado:** `[x]` Hecho
**Cubre:** Obs-005 · **Estimación:** 1 h

**Pasos.**

- [x] Nuevo componente `frontend/src/components/lotes/CrearLoteDialog.tsx` (extrae el form de `LoteForm` con la misma validación Zod) y se monta en `InspeccionForm.tsx`.
- [x] On-success: `setLote(nuevoLote)` + cerrar dialog. El estado del form de inspección se preserva.
- [x] El número escrito en el campo de búsqueda se pasa como `numeroLoteInicial` al modal para evitar re-tipear.

---

### H-3.3 — Icono "Generar ficticia"

**Estado:** `[x]` Hecho
**Cubre:** Obs-009 · **Estimación:** 30 min

**Pasos.**

- [x] `<Pencil />` → `<GitFork />` en `CertificadoDetalle.tsx`.
- [x] Botón con label visible: `<Button variant="outline"><GitFork /> Generar ficticia</Button>`.
- [x] Texto explicativo agregado al inicio de la sección "Inspecciones incluidas".

---

### H-3.4 — Botón "Reenviar" en detalle de certificado

**Estado:** `[x]` Hecho
**Cubre:** Obs-011 · **Estimación:** 30 min

**Pasos.**

- [x] El botón Reenviar ya existía en `CertificadoDetalle.tsx` (líneas 87-91) gated por `puedeReenviar && tienePendientes`.
- [x] Texto añadido cuando no aplica: *"Todos los envíos fueron exitosos — no hay nada que reintentar."* en la sección Envíos.

---

### H-3.5 — Etiqueta "Estado (rango internacional)"

**Estado:** `[x]` Hecho
**Cubre:** Obs-004 · **Estimación:** 30 min

**Pasos.**

- [x] Header de tabla cambiado a "Estado (rango internacional)" en `InspeccionForm.tsx`.
- [x] Ícono `Info` (lucide) con `title` HTML como tooltip nativo (no se introdujo dependencia de tooltip de shadcn). Texto: *"La evaluación contra los rangos personalizados del cliente se realiza al emitir el certificado, no en esta etapa."*

---

### H-3.6 — Autocomplete de lote en form de inspección

**Estado:** `[x]` Hecho
**Cubre:** Obs-001 · **Estimación:** 1.5 h

**Pasos.**

- [x] Implementación con dropdown manual (sin agregar `cmdk` para no sumar dependencias). El `<Input>` muestra una lista posicionada absoluta con coincidencias.
- [x] Consumo de `GET /lotes?q=<termino>&limit=8` con debounce de 250 ms vía `useDebounce`. Click en una sugerencia selecciona el lote, carga inspecciones previas y mantiene el estado del form.

---

### H-3.7 — Acordeón de equipos en form de inspección

**Estado:** `[x]` Hecho
**Cubre:** Obs-002 · **Estimación:** 1 h

**Pasos.**

- [x] Acordeón implementado con `useState<Set<string>>` (sin agregar shadcn/accordion). Header del equipo es ahora un botón con chevron (`ChevronDown`/`ChevronRight`); por default colapsado, el usuario expande sólo lo que vaya a llenar.
- [x] Auto-expand: si el equipo tiene al menos un parámetro con valor capturado (modo edición), se muestra abierto sin requerir click.
- [x] Contador "X/Y parámetros capturados" en el header para feedback visual.

---

### H-3.8 — Dashboard diferenciado por rol *(deuda post-entrega)*

**Estado:** `[-]` Descartado para 2026-05-01
**Motivo:** alto costo, alto valor pero no realista para el día restante. La parte mínima (ocultar acciones de escritura para roles de lectura) ya queda cubierta por H-1.1.
**Cubre:** Obs-010 (resto)

**Plan post-entrega.** Documentar como limitación conocida en SpecsTecnicas.

---

## Fase 4 — Cierre y verificación

### H-4.1 — Regresión manual UAT

**Estado:** `[ ]` Pendiente · **Estimación:** 1 h

**Pasos.** Repetir el script UAT con los 5 roles (LAB, CC, calidad, gerente, director). Confirmar:

- [ ] TopNav filtrado correctamente por rol
- [ ] Sin 404 al ver detalle de lote desde `/lotes`
- [ ] Sobreentrega rechazada (escenario Obs-006)
- [ ] PDF con desviación correcta cuando aplica rango cliente
- [ ] No hay regresiones en flujos que ya funcionaban (emitir certificado, registrar inspección, derivar ficticia, reenviar correo)

---

### H-4.2 — Pruebas automatizadas

**Estado:** `[ ]` Pendiente · **Estimación:** 1 h

**Pasos.**

- [ ] `./run-tests.sh` desde la raíz → unit + integration backend al 100%.
- [ ] Capturar `backend/coverage/coverage-summary.json` y comparar contra umbrales:
  - FQ-05: ≥ 70 % cobertura de dominio
  - FQ-06: ≥ 40 % cobertura global
- [ ] Playwright en host (no contenedor): `cd frontend && npm run test:e2e:install && npm run test:e2e`
  - 3 archivos: `auth.spec.ts`, `certificados.spec.ts`, `equipos.spec.ts`

**Si los E2E fallan.** Documentar fallos como limitación conocida; no falsificar.

---

### H-4.3 — Commits y merge a `main`

**Estado:** `[ ]` Pendiente · **Estimación:** 30 min

**Política.** Branch por fase, mensajes en inglés.

Ramas sugeridas:

- `fix/rbac-frontend-cluster` — H-1.1
- `feat/lote-detalle` — H-1.2
- `fix/inventario-lote` — H-1.3
- `fix/pdf-deviation-client-range` — H-2.1
- `fix/pdf-cosmetic-bugs` — H-3.1
- `chore/qa-ux-fixes` — bundle de H-3.2 a H-3.7

**Verificación final.**

- [ ] `docker compose up` arranca limpio (regla absoluta: no commit que rompa build).
- [ ] `git status` limpio en `main`.
- [ ] PDFs de Drive permanecen fuera de git (decisión consciente del usuario; no agregarlos a `.gitignore` con commit automático).

---

## Ruta crítica

Si el día se complica, prioriza estrictamente:

```
H-1.1 → H-1.3 → H-2.1 → H-4.1
```

H-1.2 puede degradarse al "Plan B" (retirar botón de ojo). Todo lo demás es bonus.

---

## Reparto sugerido (5 personas)

| Persona | Mañana | Tarde |
|---------|--------|-------|
| Frontend lead | H-1.1 (RBAC) | H-3.4, H-3.5 |
| Frontend 2 | H-1.2 (LoteDetalle) | H-3.2, H-3.3 |
| Backend 1 | H-1.3 backend | H-2.1 (PDF bug 4) |
| Backend 2 / QA | Tests integración H-1.3 | H-3.1 (PDF cosméticos) + H-4.2 |
| Tester / docs | Apoyo UAT | H-4.1 + actualizar `qa-hallazgos.md` |

---

## Bitácora

> Una línea por sesión. Formato: `YYYY-MM-DD HH:MM — autor — qué se hizo`.

- 2026-04-30 — Claude — documento creado a partir de `qa-hallazgos.md`. Estado inicial: 11 hitos pendientes, 1 descartado (H-3.8), 0 hechos.
- 2026-04-30 18:35 — Claude — Stack Docker arriba: backend en :3000, frontend en :5173, MailHog en :8025. Faltaban `DB_USER` / `DB_PASSWORD` / `DB_NAME` en `.env` (causa del error inicial); agregados (valor `fhesa` consistente con `DATABASE_URL`). Tras `docker compose up -d --build` apareció `ERR_MODULE_NOT_FOUND express-rate-limit` — resuelto con `docker compose exec backend npm install` + restart. Migraciones al día. Seed previo aún en BD (5 lotes, 3 certs, 4 clientes, 5 usuarios).
- 2026-04-30 — Claude — Fase 3 hitos H-3.2 a H-3.7 implementados (todos opcionalmente bundle-able en `chore/qa-ux-fixes`): nuevo `CrearLoteDialog` consumido desde `InspeccionForm`; ícono y label "Generar ficticia" + texto explicativo; mensaje de envíos completos en `CertificadoDetalle`; encabezado "Estado (rango internacional)" + tooltip nativo en tabla de resultados; autocomplete de lote con dropdown manual + debounce 250ms; acordeón de equipos con chevron, auto-expand cuando hay valores y contador de capturas. `tsc --noEmit` limpio.
- 2026-04-30 — Claude — H-3.1 implementado: helper `sanitizarParaHelvetica()` para superscripts/subscripts (Helvetica de PDFKit no soporta Unicode extendido sin embedding de fuente externa); anchos de columnas rebalanceados a `[70, 90, 55, 105, 60, 80]` (más espacio para Unidad para que `adimensional` quepa); celdas con `lineBreak: false, ellipsis: true` para evitar partido/desborde.
- 2026-04-30 — Claude — H-2.1 implementado: bug 4 del PDF (desviación contra midpoint del rango incorrecto) corregido. Refactor extrae `consolidarResultados()` como función pura exportada en `pdf.service.ts`; ahora la desviación se calcula como `valor - (limInf + limSup) / 2` usando el rango aplicable (cliente si existe, internacional si no), no la `desviacion` precalculada del modelo (que siempre era internacional). Test unitario añadido cubre el caso del ejemplo: 220 con rango cliente 201–220 → desviación +9.5 (antes -55).
- 2026-04-30 — Claude — H-1.3 implementado: nuevo `GET /api/v1/lotes/:id/saldo` (`lotesService.getSaldo`) usando `Prisma.Decimal.minus()`; validación de saldo dentro del `$transaction` de `CertificadosService.emitir()` lanza `UnprocessableEntityError` con código `LOTE_SALDO_INSUFICIENTE` y detalles serializados (producida, entregada, disponible, solicitada, unidadCantidad). Tipos `SaldoLote` agregados al frontend; `PasoEmbarque` recibe `loteId` desde el wizard, consulta el saldo y bloquea el botón Siguiente con tooltip si la cantidad excede; `LoteDetalle` muestra tarjeta "Inventario del lote" con producida/entregada/disponible. Test de integración añadido (1000 kg → 500 OK → 600 rechazado → saldo final 500). `tsc --noEmit` frontend limpio; backend pendiente de correr en Docker (`docker compose exec backend npm run typecheck` y `npm test`).
- 2026-04-30 — Claude — H-1.2 implementado: `LoteDetalle.tsx` consume `GET /inspecciones?loteId=...` y `GET /certificados?loteId=...` (ambos ya soportan ese filtro). Renderiza tarjeta de información del lote, timeline de inspecciones ordenadas por secuencia A–Z (con badge de estado, marca de ficticia y referencia a inspección origen) y listado de certificados emitidos clicables hacia su detalle. Ruta `/lotes/:id` ya estaba registrada. Saldo del lote diferido a H-1.3. `tsc --noEmit` limpio.
- 2026-04-30 — Claude — H-1.1 implementado: nuevo módulo `frontend/src/lib/rbac.ts` con mapa rol→rutas y constantes de escritura por dominio; `TopNav` filtra `navItems`; `AppRoutes` envuelve `/equipos/nuevo`, `/equipos/:id/editar`, `/clientes/nuevo`, `/clientes/:id/editar`, `/lotes/nuevo`, `/inspecciones/nueva`, `/inspecciones/:id/editar` y `/certificados/nuevo` con `<RoleRoute>`; `Dashboard` oculta acciones rápidas según rol; listados de Lotes/Equipos/Clientes/Inspecciones consumen las constantes centralizadas. `tsc --noEmit` limpio. Pendiente UAT con los 5 roles.

---

## Notas de contexto del proyecto

- `compose.yaml` (no `docker-compose.yml`).
- Soft delete vía `estado` / `activo`; nunca `DELETE`.
- Migraciones Prisma no se editan; se crean nuevas con `npx prisma migrate dev --name <desc>`.
- Idioma: tablas/columnas/UI en español; logs y commits en inglés.
- TypeScript estricto; Zod en toda escritura; constructor injection.
- PDFs de Drive viven en working tree pero **fuera de git** (no agregar a `.gitignore` con commit automático).
- Documento de hallazgos fuente: [`qa-hallazgos.md`](qa-hallazgos.md).
- Handoff de auditoría de fases (contexto adicional, no de QA): `.claude/worktrees/focused-mcnulty-021e46/handoff-auditoria-fases.md`.
