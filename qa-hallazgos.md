# Bitácora de QA — FHESA
## Hallazgos de la sesión de pruebas de aceptación

> Documento de **handoff al equipo de desarrollo**.
> Recoge las observaciones detectadas durante la pasada de QA sobre la aplicación FHESA (Sistema de Emisión de Certificados de Calidad — Fábrica de Harinas Elizondo, S.A. de C.V.).

**Equipo evaluador:** Equipo 5 — Carlos, Fernando, Mario, Mauricio, Juan Pablo
**Fecha de la sesión:** 2026-04-29
**Build evaluada:** rama `polnito-llico-23-de-abril-de-2026` (último commit conocido: `02cadcc`, cierre de Fase G)
**Roles probados:** LABORATORIO, CONTROL_CALIDAD, ASEGURAMIENTO_CALIDAD, GERENTE_PLANTA, DIRECTOR_OPERACIONES

---

## Índice

1. [Cómo leer este documento](#cómo-leer-este-documento)
2. [Glosario rápido del dominio](#glosario-rápido-del-dominio)
3. [Resumen ejecutivo](#resumen-ejecutivo)
4. [Hallazgos](#hallazgos)
5. [Plan de ataque sugerido](#plan-de-ataque-sugerido)
6. [Plantilla para nuevos hallazgos](#plantilla-para-nuevos-hallazgos)

---

## Cómo leer este documento

Cada hallazgo (Obs-NNN) es un bloque autocontenido con la siguiente estructura:

- **Severidad** — `Bloqueante` (impide entregar o rompe el contrato académico), `No-bloqueante` (deuda UX / funcional menor), `Cosmético` (sólo presentación).
- **Módulo / Pantalla** — dónde se observa.
- **Rol(es) afectado(s)** — quién lo encuentra al usar el sistema.
- **¿Qué se observó?** — descripción narrativa de lo visto.
- **¿Por qué importa?** — impacto en negocio o usuario.
- **Cómo reproducirlo** — pasos exactos para volver a verlo.
- **Comportamiento esperado** — qué debería suceder en su lugar.
- **Sugerencia técnica** — propuesta de fix con punteros al código.
- **Relacionado con** — referencia a otras observaciones que comparten causa raíz.

---

## Glosario rápido del dominio

> Recordatorio para el equipo (los conceptos están detallados en `CLAUDE.md` y en la Entrega 2 del proyecto).

- **Lote** — tanda de harina producida con identificador único (ej. `L-2026-0412`); tiene `cantidadProducida` (kg) y un producto asociado.
- **Inspección** — medición de parámetros físico-químicos hecha por **LABORATORIO** sobre un lote (humedad, proteína, W, falling number, cenizas, etc.).
- **Estado de inspección** ([schema.prisma:44-46](backend/prisma/schema.prisma#L44-L46)):
  - `BORRADOR` — editable.
  - `CERRADA` — **inmutable**; sólo desde aquí se puede usar para emitir certificados o derivar ficticias.
- **Serie A-Z** — las inspecciones de un mismo lote se numeran con letra consecutiva (A, B, C, …, Z; máximo 26). Es un contador secuencial, no una categoría.
- **Inspección ficticia** — cuando una inspección sale fuera de especificación, se puede **derivar** una nueva inspección con resultados ajustados (típicamente tras una remediación física: secado, retamizado, blend con otro lote). La original *no* se modifica — la ficticia es una nueva inspección con `esFicticia=true` que consume la siguiente letra de la serie. Requiere justificación textual y debe diferir en al menos un valor respecto al origen ([inspecciones.service.ts:319](backend/src/modules/inspecciones/inspecciones.service.ts#L319)).
- **Certificado** — documento firmado emitido al cliente, basado en una o más inspecciones CERRADAS de un lote. Numeración formato `CERT-AAAA-NNNNNN`.
- **Estado de certificado** ([schema.prisma:51-55](backend/prisma/schema.prisma#L51-L55)): `EMITIDO` → `ENVIO_PARCIAL` → `ENVIADO`. **Inmutable en los tres estados** (regla absoluta del `CLAUDE.md`). Correcciones generan un nuevo certificado con nueva numeración.
- **Rangos de un parámetro** — cada parámetro tiene un **rango internacional** (estándar de referencia) y opcionalmente un **rango personalizado por cliente** (más estricto). Los rangos del cliente sólo se evalúan al **emitir el certificado**, no al registrar la inspección.

---

## Resumen ejecutivo

| #  | Severidad        | Módulo               | Estado     | Título                                                                                       |
|----|------------------|----------------------|------------|----------------------------------------------------------------------------------------------|
| 001| No-bloqueante    | Inspecciones         | Abierto    | Búsqueda de lote sin autocompletado                                                          |
| 002| No-bloqueante    | Inspecciones         | Abierto    | Form de inspección lista todos los equipos sin filtro                                        |
| 003| **Bloqueante**   | Lotes                | Abierto    | Detalle de lote no existe (404)                                                              |
| 004| No-bloqueante    | Inspecciones         | Abierto    | Columna "Estado" no aclara contra qué rango se evalúa                                        |
| 005| No-bloqueante    | Inspecciones         | Abierto    | Atajo "Crear lote" pierde contexto del form                                                  |
| 006| **Bloqueante**   | Certificados         | Abierto    | No hay control de inventario por lote (sobreentrega permitida)                               |
| 007| No-bloqueante    | Certificados / PDF   | Abierto    | Cuatro bugs visuales en el PDF emitido                                                       |
| 008| **Bloqueante**   | RBAC frontend        | Abierto    | RBAC ausente en frontend para módulo Clientes                                                |
| 009| No-bloqueante    | Certificados         | **Reescrito** | Ícono de lápiz induce a confusión (es "Generar ficticia", no "editar")                    |
| 010| No-bloqueante    | Dashboard            | Abierto    | Dashboard idéntico para todos los roles                                                      |
| 011| No-bloqueante    | Certificados         | Abierto    | Acción "Reenviar correo" sólo disponible en el listado, no en el detalle                     |
| 012| **Bloqueante**   | RBAC frontend        | Abierto    | UAT con GERENTE_PLANTA confirma fugas de UI privilegiada                                     |
| 013| **Bloqueante**   | RBAC frontend        | Abierto    | UAT con DIRECTOR_OPERACIONES confirma mismos síntomas + acierto en `/inspecciones`           |

**Totales:** 13 hallazgos — **5 bloqueantes**, **8 no-bloqueantes**, 0 puramente cosméticos.

> ⚠️ **Obs-008, Obs-012 y Obs-013 comparten una sola causa raíz** (ausencia de filtrado por rol en `TopNav`, `AppRoutes` y "Acciones rápidas" del dashboard). Se pueden cerrar con un único cambio coordinado — ver [Plan de ataque sugerido](#plan-de-ataque-sugerido).

---

## Hallazgos

### Obs-001 — Búsqueda de lote sin autocompletado

- **Severidad:** No-bloqueante (UX)
- **Pantalla:** `/inspecciones/nueva`
- **Rol afectado:** LABORATORIO
- **¿Qué se observó?** El campo "Número de lote" exige que el usuario escriba el identificador exacto (formato `L-AAAA-NNNN`, ej. `L-2026-0412`) y presione el botón "Buscar". No ofrece autocompletado, sugerencias en vivo ni desplegable de coincidencias mientras se teclea.
- **¿Por qué importa?** El operador de laboratorio rara vez memoriza el número exacto del lote — generalmente trabaja con varios al día. Hoy debe abrir `/lotes` en otra pestaña, copiar el identificador y volver, lo que rompe el flujo y aumenta el riesgo de error de transcripción.
- **Cómo reproducirlo:**
  1. Login como `lab@fhesa.mx`.
  2. Ir a `/inspecciones/nueva`.
  3. Intentar escribir parte del número (ej. `2026-04`) sin recordar el sufijo exacto.
  4. Notar que no aparece ningún listado de coincidencias; el form requiere el valor exacto + clic en "Buscar".
- **Comportamiento esperado:** Combobox con type-ahead que sugiera lotes que coinciden con lo tecleado (a partir de 2-3 caracteres). El usuario selecciona del desplegable y el form continúa.
- **Sugerencia técnica:** Reemplazar el `<Input>` por un combobox basado en `cmdk` (ya está en el árbol de dependencias del proyecto vía shadcn/ui). Endpoint backend: `GET /lotes?q=<termino>` ya soporta búsqueda parcial; sólo falta consumirlo desde el front en modo type-ahead con debounce de ~250 ms.
- **Referencia código:** [frontend/src/pages/inspecciones/InspeccionForm.tsx:194](frontend/src/pages/inspecciones/InspeccionForm.tsx#L194)

---

### Obs-002 — Form de inspección lista todos los equipos sin filtro

- **Severidad:** No-bloqueante (UX / escalabilidad)
- **Pantalla:** `/inspecciones/nueva` (después de seleccionar un lote)
- **Rol afectado:** LABORATORIO
- **¿Qué se observó?** La sección "Resultados" del form despliega **todos los equipos activos** del catálogo simultáneamente, cada uno con su tabla completa de parámetros desplegada. Con el seed actual (3 equipos) la página es manejable; el problema se manifestará al crecer el catálogo.
- **¿Por qué importa?**
  1. **Escalabilidad:** con un catálogo realista (>10 equipos), la página requeriría scroll excesivo y volvería el form difícil de usar.
  2. **Falta de guía contextual:** la UI no comunica cuáles equipos son relevantes para el producto del lote en curso. El operador debe saber por contexto cuáles llenar y cuáles dejar vacíos. Un usuario menos experimentado podría llenar parámetros que no aplican o dejar fuera mediciones obligatorias.
- **Cómo reproducirlo:**
  1. Login como `lab@fhesa.mx`.
  2. Ir a `/inspecciones/nueva` y seleccionar cualquier lote.
  3. Hacer scroll por la sección "Resultados".
  4. Observar que aparecen los 3 equipos del seed sin distinción de cuáles aplican al producto del lote.
- **Comportamiento esperado:** El form muestra solo los equipos que el usuario va a usar, idealmente filtrados según el producto del lote.
- **Sugerencia técnica:** En orden creciente de esfuerzo:
  1. **(Mínimo)** Colapsar cada sección de equipo por default (acordeón); el usuario expande sólo los que vaya a llenar. Reduce el ruido visual sin cambiar el modelo.
  2. **(Intermedio)** Multi-select al inicio del form: *"¿Qué equipos se usaron en esta inspección?"*. Sólo se renderizan las tablas de los equipos seleccionados.
  3. **(Cambio mayor — fuera del alcance académico)** Asociar equipos a productos en el modelo de datos (`producto_equipo` n:m) y filtrar automáticamente por el producto del lote.
- **Referencia código:** [frontend/src/pages/inspecciones/InspeccionForm.tsx:276](frontend/src/pages/inspecciones/InspeccionForm.tsx#L276)

---

### Obs-003 — Detalle de lote no existe (404 al hacer clic en "ver")

- **Severidad:** **Bloqueante** (funcional)
- **Pantalla:** `/lotes` (listado) → botón con ícono de ojo en la columna "Acciones"
- **Rol afectado:** Todos los roles que acceden al listado de lotes
- **¿Qué se observó?** En la fila de cada lote del listado existe un botón con ícono de ojo. Al pulsarlo, la app navega a `/lotes/<id>` — pero esa ruta **no está registrada** en el router del frontend. El usuario aterriza en la página de error 404 ("Página no encontrada").
- **¿Por qué importa?** Esto rompe el caso de uso **UC-11 — "Ver secuencia A-Z de un lote"** descrito en la guía UAT. Sin pantalla de detalle no hay forma desde la UI de:
  - Ver la línea de tiempo de inspecciones (A, B, C…) que se le hicieron al lote.
  - Saber si una inspección fue cerrada, derivada en ficticia, o si el lote fue certificado.
  - Identificar qué certificados se emitieron sobre ese lote (relacionado con Obs-006).
- **Cómo reproducirlo:**
  1. Login con cualquier usuario autenticado.
  2. Ir a `/lotes`.
  3. Click en el ícono de ojo de cualquier fila.
  4. La app navega a `/lotes/<id>` y muestra "Error 404 — Página no encontrada".
- **Comportamiento esperado:** Pantalla de detalle del lote con:
  - Datos del lote (producto, fecha, cantidad producida).
  - Línea de tiempo de inspecciones con sus letras (A, B, …) y estado (BORRADOR/CERRADA/Ficticia).
  - Listado de certificados emitidos sobre ese lote.
  - Idealmente, indicador visual del **saldo de inventario** disponible vs. cantidad ya certificada (alimenta el fix de Obs-006).
- **Sugerencia técnica:** Crear `frontend/src/pages/lotes/LoteDetalle.tsx` y registrar la ruta en `AppRoutes.tsx`:
  ```tsx
  <Route path="/lotes/:id" element={<LoteDetalle />} />
  ```
  El backend ya tiene endpoint para esto (`GET /lotes/:id` con joins a inspecciones y certificados). Si por tiempo no se va a implementar, **la alternativa mínima** es retirar el botón del ojo del listado para no inducir al error.
- **Referencia código:**
  - Origen del clic: [frontend/src/pages/lotes/LotesListado.tsx:72](frontend/src/pages/lotes/LotesListado.tsx#L72)
  - Router sin la ruta: [frontend/src/routes/AppRoutes.tsx:44](frontend/src/routes/AppRoutes.tsx#L44)
- **Relacionado con:** Obs-006 (la pantalla de detalle es donde idealmente se vería el saldo del lote).

---

### Obs-004 — Columna "Estado" no aclara contra qué rango se evalúa

- **Severidad:** No-bloqueante (UX / claridad)
- **Pantalla:** `/inspecciones/nueva`, sección "Resultados"
- **Rol afectado:** LABORATORIO
- **¿Qué se observó?** Mientras el operador captura valores en la tabla de un equipo, la columna "Estado" muestra `Dentro` o `Fuera` para cada parámetro. La etiqueta no aclara contra qué rango se está comparando.
- **¿Por qué importa?** Hay dos rangos posibles para cada parámetro: el **internacional** (estándar) y el **personalizado del cliente** (más estricto, si el cliente lo definió). El form actualmente sólo evalúa contra el internacional — los rangos del cliente recién se aplican al emitir el certificado. El operador podría creer erróneamente que el form ya considera al cliente del lote (cuando ni siquiera el lote tiene cliente asignado en el modelo actual). Confunde el flujo y puede llevar a emitir certificados cuyo "Dentro" en inspección termina siendo "Fuera" para el cliente concreto.
- **Cómo reproducirlo:**
  1. Login como `lab@fhesa.mx`.
  2. Ir a `/inspecciones/nueva`, seleccionar un lote.
  3. Capturar un valor en cualquier parámetro y observar que la columna "Estado" cambia a `Dentro` o `Fuera` sin más contexto.
- **Comportamiento esperado:** La columna comunica explícitamente qué rango está evaluando — y aclara cuándo aplica cuál. Ejemplo: header `Estado (rango internacional)` + nota informativa al inicio de la sección.
- **Sugerencia técnica:**
  - Cambiar el header de la columna: `Estado` → `Estado (rango internacional)`.
  - Agregar tooltip de ayuda (ícono `Info`) con texto: *"La evaluación contra los rangos personalizados del cliente se realiza al emitir el certificado, no en esta etapa."*
- **Referencia código:** [frontend/src/pages/inspecciones/InspeccionForm.tsx:291](frontend/src/pages/inspecciones/InspeccionForm.tsx#L291)
- **Relacionado con:** Obs-007 bug 4 (en el PDF, la desviación contra rango cliente está mal calculada — síntoma del mismo modelo mental confuso).

---

### Obs-005 — Atajo "Crear lote" pierde el contexto del form de inspección

- **Severidad:** No-bloqueante (UX)
- **Pantalla:** `/inspecciones/nueva`, sección "Lote de producción"
- **Rol afectado:** LABORATORIO, CONTROL_CALIDAD
- **¿Qué se observó?** Al lado del campo "Número de lote" hay un botón secundario **"Crear lote"** pensado como atajo para cuando el lote aún no existe. Sin embargo, ese botón simplemente llama a `navigate("/lotes/nuevo")`, lo cual:
  1. **Pierde todo el estado del form de inspección** ya capturado (fecha, valores en otros equipos, observaciones).
  2. **Tras crear el lote, deja al usuario en `/lotes`**, no en el form de inspección. El usuario debe regresar manualmente a `/inspecciones/nueva` y reingresar el lote.
- **¿Por qué importa?** En el flujo real, lo común es que el operador empiece a capturar la inspección y descubra a media captura que el lote no estaba dado de alta (porque producción todavía no lo registró). El "atajo" hoy lo penaliza en lugar de ayudarlo.
- **Cómo reproducirlo:**
  1. Login como `lab@fhesa.mx`.
  2. Ir a `/inspecciones/nueva`. Capturar fecha, observaciones, y valores en algunos parámetros (sin seleccionar lote todavía).
  3. Click en "Crear lote".
  4. Notar que la página cambia a `/lotes/nuevo` y todo lo capturado se perdió.
- **Comportamiento esperado:** El atajo abre el alta de lote en un **modal** sobre la pantalla actual. Al confirmar, el modal se cierra precargando automáticamente el nuevo lote en el campo de búsqueda — sin recargar ni perder el estado del form.
- **Sugerencia técnica:** Convertir el botón en un `Dialog` (shadcn/ui) que envuelva un `LoteFormInline` reutilizando los campos de `LoteForm`. En el callback de éxito: `setLote(nuevoLote); closeDialog();`.
- **Referencia código:** [frontend/src/pages/inspecciones/InspeccionForm.tsx:209](frontend/src/pages/inspecciones/InspeccionForm.tsx#L209)

---

### Obs-006 — No existe control de inventario por lote (sobreentrega permitida)

- **Severidad:** **Bloqueante** (lógica de dominio)
- **Pantalla:** Wizard de emisión de certificado, paso "Datos de embarque" (`/certificados/nuevo`)
- **Rol afectado:** CONTROL_CALIDAD
- **¿Qué se observó?** El campo `cantidadEntrega` del certificado se valida sólo contra `cantidadSolicitada` del propio certificado (entrega ≤ solicitada). **Nunca se compara contra la `cantidadProducida` del lote ni contra la suma de entregas previas en otros certificados del mismo lote.** El sistema permite emitir certificados sucesivos cuya suma de entregas exceda la producción real del lote.
- **¿Por qué importa?**
  - **Datos inconsistentes en certificados emitidos**: el papel firmado dice que el lote certificó más harina de la que físicamente produjo.
  - **Riesgo regulatorio y de trazabilidad**: ante una auditoría sanitaria o un reclamo en campo, los números no cuadran con producción.
  - **Riesgo comercial**: dos clientes podrían reclamar entrega del mismo material físico.
- **Cómo reproducirlo:**
  1. Crear lote `L-2026-X` con `cantidadProducida = 1000 kg`.
  2. Realizar inspección A y cerrarla.
  3. Login como `cc@fhesa.mx` (CONTROL_CALIDAD). Ir a `/certificados/nuevo`.
  4. Emitir certificado A para Cliente 1 con `cantidadEntrega = 500 kg` → OK.
  5. Repetir paso 3-4: emitir certificado B para Cliente 2 con `cantidadEntrega = 600 kg` (mismo lote).
  6. **El sistema emite el certificado B sin advertencia.** Total entregado = 1100 kg > 1000 kg producidos.
- **Comportamiento esperado:** Al construir el certificado, el sistema calcula:
  ```
  saldoLote = cantidadProducida − Σ(cantidadEntrega de certificados activos del mismo lote)
  ```
  y rechaza (o al menos advierte fuertemente) si la nueva entrega lo excede. Idealmente el saldo se muestra al usuario ya en el paso "Lote e inspecciones" del wizard, antes de llegar a "Datos de embarque".
- **Sugerencia técnica:** El check correcto pertenece al backend (regla de dominio). Lugares a tocar:
  1. `backend/src/modules/certificados/certificados.service.ts` — agregar cálculo de saldo y validación al crear el certificado.
  2. Backend expone endpoint nuevo: `GET /lotes/:id/saldo` → `{ producida, entregada, disponible }` (consumido por front en el wizard).
  3. `frontend/src/pages/certificados/wizard/PasoEmbarque.tsx` — agregar validación local que muestre el saldo y bloquee al exceder.
- **Referencia código:**
  - Schema sin restricción: [backend/prisma/schema.prisma:305](backend/prisma/schema.prisma#L305)
  - Validación local insuficiente del wizard: [frontend/src/pages/certificados/wizard/PasoEmbarque.tsx:25](frontend/src/pages/certificados/wizard/PasoEmbarque.tsx#L25)
- **Relacionado con:** Obs-003 (la pantalla de detalle de lote es el lugar natural para mostrar el saldo).

---

### Obs-007 — Cuatro bugs visuales en el PDF emitido

- **Severidad:** No-bloqueante (presentación / cosmético funcional)
- **Pantalla:** PDF generado al emitir un certificado (archivo en `certificados-pdf/<año>/<mes>/CERT-AAAA-NNNNNN.pdf`)
- **Rol afectado:** Cliente final (recibe el PDF firmado), CONTROL_CALIDAD (lo revisa antes de enviar)
- **¿Qué se observó?** En la tabla "Resultados de análisis" del PDF se observan al menos cuatro defectos de maquetación, descritos a continuación. La severidad agregada es no-bloqueante, pero **el bug 4 raya en bloqueante** porque transmite información incorrecta al cliente.

#### Bug 1 — Encoding del superíndice en la unidad de W

La unidad correcta del parámetro **W (alveograma)** es `x10⁻⁴ J`. En el PDF se renderiza como `x10 { t J`, una basura visual.

**Causa probable:** la fuente embebida en PDFKit no soporta el carácter Unicode `⁻` (U+207B, "superscript minus"). El motor lo sustituye por glifos arbitrarios.

**Fix sugerido:**
- Cambiar la fuente embebida a una con soporte Unicode extendido (DejaVu Sans, Noto Sans). Es un cambio de un par de líneas en `pdf.service.ts`.
- Alternativa de mínimo esfuerzo: sustituir `⁻⁴` por `^-4` en el string antes de imprimirlo.

#### Bug 2 — Texto que invade la columna "Resultado"

En varias filas, la **letra inicial del nombre del parámetro** se desplaza/duplica al lado de la palabra "Cumple" en la columna siguiente. Se observa: `FCumple` (parámetro **F**QN), `L Cumple` (parámetro **L**), `TCumple` (parámetro **T**DM).

**Causa probable:** alguna celda de la tabla no tiene `width` explícito y el texto rebasa al renderizar con `lineGap` agresivo, dejando residuos del nombre del parámetro a la altura de la columna siguiente.

**Fix sugerido:** revisar las coordenadas de cada celda en la función `renderPdf()`; sospecha concreta: la columna "Parámetro" no tiene ancho fijo y se sale al renderizar parámetros de una sola letra.

#### Bug 3 — Quiebre de palabra mal calculado en columna "Unidad"

La palabra `adimensional` se parte como `adimension al` (con el `al` en una nueva línea por wrap forzado).

**Causa probable:** `lineBreak: false` o ausencia del flag, combinado con un ancho de columna insuficiente para la palabra completa.

**Fix sugerido:** asegurar `lineBreak: true` y aumentar el ancho de la columna "Unidad", o reducir tamaño de fuente sólo en esa columna a 8 pt.

#### Bug 4 — Desviación inconsistente cuando aplica rango del cliente (⚠️ el más serio de los cuatro)

Cuando el rango aceptable del parámetro proviene del **cliente** (sufijo "(C)" en la tabla), la **desviación** mostrada se sigue calculando contra el midpoint del rango **internacional**, no contra el del cliente.

**Ejemplo reproducible:** parámetro "Prueba", valor capturado 220, rango cliente 201–220, rango internacional 200–350.
- Desviación correcta vs. cliente: `220 − midpoint(201, 220) = 220 − 210.5 = +9.5`.
- Lo que muestra el PDF: `220 − midpoint(200, 350) = 220 − 275 = −55`.

El cliente recibe un PDF que dice "desviación −55" cuando el operador interno lo evaluó contra rango del cliente y vio "desviación +9.5". Ambas inconsistentes entre sí.

**Fix sugerido:** recalcular `desviacion` dentro de `pdf.service.ts` usando el rango aplicable (cliente cuando exista, internacional si no), en lugar de tomar `r.desviacion` precalculado en el modelo (que asume internacional).

#### Referencia común a los cuatro

- **Referencia código:** [backend/src/modules/certificados/pdf.service.ts:104-145](backend/src/modules/certificados/pdf.service.ts#L104-L145)
- **Relacionado con:** Obs-004 (mismo modelo mental confuso entre rangos internacional y cliente).

---

### Obs-008 — RBAC ausente en frontend para módulo Clientes (y posiblemente otros)

- **Severidad:** **Bloqueante** (UX / fuga de UI privilegiada)
- **Pantalla:** TopNav, `/clientes`, `/clientes/nuevo`, `/clientes/:id/editar`
- **Rol afectado:** LABORATORIO, ASEGURAMIENTO_CALIDAD, GERENTE_PLANTA, DIRECTOR_OPERACIONES (cualquier rol distinto a CONTROL_CALIDAD)
- **¿Qué se observó?** El backend protege correctamente las rutas de escritura de `/clientes` con `requireRole("CONTROL_CALIDAD")` ([clientes.routes.ts:44](backend/src/modules/clientes/clientes.routes.ts#L44) y siguientes). En el frontend, sin embargo, la ruta `/clientes/nuevo` está envuelta sólo por `<ProtectedRoute>` (autenticación) y **no** por `<RoleRoute>` (autorización). El componente `RoleRoute` ya existe en el repositorio ([RoleRoute.tsx](frontend/src/routes/RoleRoute.tsx)) pero no se usa en `AppRoutes.tsx`. Adicionalmente, el `TopNav` muestra el ítem "Clientes" para todos los roles autenticados.
- **¿Por qué importa?**
  1. **Mala UX**: el usuario llena un formulario completo sólo para recibir un 403 al final, sin pista previa de que la operación no le corresponde.
  2. **Fuga de UI privilegiada**: roles no autorizados ven detalles de pantallas que no deberían (qué campos pide, qué validaciones, qué relaciones tiene la entidad).
  3. **Viola el principio de menor privilegio**: la regla de oro es no exponer interfaces que el usuario no puede usar.
- **Cómo reproducirlo:**
  1. Login como `lab@fhesa.mx` (rol LABORATORIO).
  2. Click en "Clientes" en el TopNav → se carga el listado completo.
  3. Click en "Nuevo" o navegar directo a `/clientes/nuevo` → se renderiza el form completo con todos sus campos.
  4. Capturar datos cualesquiera y presionar "Guardar" → ahora sí, el backend devuelve 403.
- **Comportamiento esperado:**
  - El ítem "Clientes" no aparece en el TopNav para roles que no lo necesitan.
  - La navegación directa por URL (`/clientes/nuevo`) redirige a `/dashboard` o muestra una página de "no autorizado" *antes* de renderizar el form.
- **Sugerencia técnica:**
  1. Envolver las rutas de escritura/lectura privilegiadas con `<RoleRoute roles={["CONTROL_CALIDAD"]}>` en `AppRoutes.tsx`.
  2. Filtrar los ítems del `TopNav` por rol — agregar un mapa `Record<RolUsuario, RutaPermitida[]>` o un campo `roles?: RolUsuario[]` en cada `navItem`.
  3. Aplicar la misma revisión a `/equipos`, `/inspecciones` (LAB+CONTROL), `/certificados` (CONTROL), `/reportes` (depende del rol).
- **Referencia código:**
  - Router sin guard de rol: [frontend/src/routes/AppRoutes.tsx:39](frontend/src/routes/AppRoutes.tsx#L39)
  - Componente disponible no usado: [frontend/src/routes/RoleRoute.tsx](frontend/src/routes/RoleRoute.tsx)
  - Referencia de gating *que sí funciona* (a replicar): [frontend/src/pages/certificados/CertificadoDetalle.tsx:23](frontend/src/pages/certificados/CertificadoDetalle.tsx#L23)
- **Relacionado con:** Obs-010, Obs-012, Obs-013 — todas comparten la misma causa raíz.

---

### Obs-009 — Ícono de lápiz junto a inspección CERRADA induce a confusión (no es para editar — es para "Generar ficticia")

> **Reescrito el 2026-04-29.** La redacción original de este hallazgo asumía que el botón disparaba un form de edición. Al revisar el código se confirma que **no es así** — el botón abre el flujo de "Generar ficticia", que es una operación legítima incluso con la inspección CERRADA y con el certificado ya emitido. El problema real es de **affordance del icono**, no de inmutabilidad violada. Se reescribe el hallazgo a continuación y se degrada la severidad de Bloqueante a No-bloqueante.

- **Severidad:** No-bloqueante (UX / icono engañoso)
- **Pantalla:** Detalle de certificado (`/certificados/:id`), sección "Inspecciones incluidas"
- **Rol afectado:** CONTROL_CALIDAD (es el único que ve el botón; ya está correctamente gateado por `puedeEditar`)
- **¿Qué se observó?** Al lado de cada inspección listada en el certificado aparece un botón con **ícono de lápiz** (`Pencil` de `lucide-react`). El `title` real del botón es `"Generar ficticia"` y el `onClick` abre el modal de derivación de inspección ficticia ([CertificadoDetalle.tsx:172-181](frontend/src/pages/certificados/CertificadoDetalle.tsx#L172-L181)). El icono de lápiz, sin embargo, **comunica visualmente "editar"** — lo cual contradice la regla de negocio de inmutabilidad de certificados emitidos.
- **¿Por qué importa?** Durante UAT del 2026-04-29 el evaluador interpretó el botón como "editar la inspección o el lote del certificado", lo que causó dudas reales sobre si el sistema cumplía con la regla de inmutabilidad. Esto es un fallo de comunicación visual: el mecanismo subyacente (derivar ficticia) es correcto, pero el icono lo disfraza de algo prohibido.
- **Cómo reproducirlo:**
  1. Login como `cc@fhesa.mx` (CONTROL_CALIDAD).
  2. Ir a `/certificados/CERT-2026-000003` (o cualquier certificado emitido).
  3. Bajar a la sección "Inspecciones incluidas".
  4. Observar el ícono de lápiz al lado de la inspección. Hacer hover para ver el tooltip "Generar ficticia".
- **Comportamiento esperado:** Un icono que comunique "derivar / generar copia ajustada" — por ejemplo `GitFork`, `CopyPlus` o `RefreshCw` — acompañado de **etiqueta de texto visible** ("Generar ficticia") en lugar de sólo tooltip. Adicionalmente, una nota explicativa al inicio de la sección que aclare el mecanismo de ficticia.
- **Sugerencia técnica:**
  - Cambiar `<Pencil />` por un icono de derivación (sugerencia: `GitFork` de `lucide-react`).
  - Convertir el botón de icon-only a icon+label visible: `<Button><GitFork /> Generar ficticia</Button>`.
  - Agregar al header de la sección un texto explicativo: *"Si una inspección queda fuera de especificación, puedes derivar una ficticia ajustada — la original se preserva intacta."*
- **Referencia código:** [frontend/src/pages/certificados/CertificadoDetalle.tsx:172-181](frontend/src/pages/certificados/CertificadoDetalle.tsx#L172-L181)

---

### Obs-010 — Dashboard idéntico para todos los roles, sin indicadores específicos ni gráficas

- **Severidad:** No-bloqueante (UX / valor de producto)
- **Pantalla:** `/dashboard` (en todos los roles)
- **Rol afectado:** Principalmente ASEGURAMIENTO_CALIDAD, GERENTE_PLANTA, DIRECTOR_OPERACIONES (los que viven del dashboard)
- **¿Qué se observó?** El dashboard muestra, sin diferenciación por rol:
  - Los mismos 4 indicadores numéricos (Certificados emitidos, Lotes en especificación, Clientes activos, Inspecciones ficticias).
  - Las mismas 4 "Acciones rápidas" (Registrar inspección, Emitir certificado, Nuevo cliente, Registrar lote).
- **¿Por qué importa?**
  1. **Acciones de escritura se exponen a roles de sólo lectura** (manifestación de Obs-008): un usuario `calidad`, `gerente` o `director` ve los botones "Nuevo cliente" / "Emitir certificado" y al pulsarlos acaba en formularios que el backend rechaza con 403.
  2. **No hay valor diferenciado por rol**: los roles ejecutivos (GERENTE, DIRECTOR) y de auditoría (ASEGURAMIENTO_CALIDAD) son justamente los que más uso harían del dashboard, y son los que reciben menos valor — los KPIs operativos crudos no son lo que su perfil necesita.
- **Cómo reproducirlo:** Login con cualquier rol → ir a `/dashboard`. La pantalla es idéntica en LAB, CC, calidad, gerente y director.
- **Comportamiento esperado:**
  - **CONTROL_CALIDAD**: ve las acciones rápidas operativas (las actuales).
  - **LABORATORIO**: sólo ve "Registrar inspección" como acción.
  - **ASEGURAMIENTO_CALIDAD**: ve indicadores de auditoría (tasa de ficticias, lotes rechazados, % de inspecciones fuera de spec por equipo); ninguna acción de escritura.
  - **GERENTE_PLANTA / DIRECTOR_OPERACIONES**: ven gráficas de tendencia (certificados/mes, % en spec por producto, top clientes); ninguna acción de escritura.
- **Sugerencia técnica:**
  1. **(Mínimo, alta prioridad)** Filtrar las "Acciones rápidas" según rol: ocultarlas para roles de sólo lectura. Cierra parte de Obs-008/012/013.
  2. **(Intermedio)** Agregar tarjetas/gráficas específicas por rol — incluso sin librerías nuevas, con SVG simple o tablas comparativas se puede ofrecer valor diferenciado.
  3. **(Cambio mayor)** Gráficas básicas (línea de tiempo de certificados emitidos por mes, barras de % en spec por producto) que aprovechen los datos que ya están en BD.
- **Referencia código:** [frontend/src/pages/Dashboard.tsx](frontend/src/pages/Dashboard.tsx)
- **Relacionado con:** Obs-008, Obs-012, Obs-013.

---

### Obs-011 — Acción "Reenviar correo" sólo disponible en el listado, no en el detalle

- **Severidad:** No-bloqueante (UX / consistencia)
- **Pantalla:** `/certificados` (listado) vs. `/certificados/:id` (detalle)
- **Rol afectado:** CONTROL_CALIDAD
- **¿Qué se observó?** La acción "Reenviar correo" existe en el backend ([certificados.service.ts:417](backend/src/modules/certificados/certificados.service.ts#L417)) y se expone como botón en el **listado** de certificados, condicionado a `c.estado !== "ENVIADO"` y al rol con permiso de emisión. **No aparece en la pantalla de detalle del certificado**, donde sería el lugar más natural para encontrarla.
- **¿Por qué importa?** El detalle del certificado es justo donde alguien va cuando un cliente reporta problemas con su envío (ej. *"no me llegó el correo del CERT-2026-000003"*). Hoy, desde el detalle, no se ve la acción — el usuario debe regresar al listado, buscar la fila del certificado y reenviar desde ahí. Inconsistente con el patrón general "todo lo que puedes hacer con esta entidad está en su detalle".
- **Cómo reproducirlo:**
  1. Login como `cc@fhesa.mx`.
  2. Ir a `/certificados` y notar el botón "Reenviar" en cada fila aplicable.
  3. Click en el ícono de ojo de cualquier certificado para abrir su detalle.
  4. Notar que en el detalle no aparece la acción "Reenviar".
- **Comportamiento esperado:** En el detalle del certificado, mostrar la acción "Reenviar" con la misma regla de visibilidad (sólo si hay envíos pendientes/fallidos y el rol tiene permiso) — bien sea como acción del header (junto a "Descargar PDF") o dentro de la sección "Envíos". Si no aplica, mostrar texto explicativo: *"Todos los envíos fueron exitosos — no hay nada que reintentar."*
- **Sugerencia técnica:** Agregar el botón en `CertificadoDetalle.tsx` reutilizando la misma función `reenviar()` ya implementada (la lógica está, sólo falta el botón en la otra pantalla).
- **Referencia código:**
  - Backend: [backend/src/modules/certificados/certificados.routes.ts:49](backend/src/modules/certificados/certificados.routes.ts#L49)
  - Frontend (sólo listado): [frontend/src/pages/certificados/CertificadosListado.tsx:133](frontend/src/pages/certificados/CertificadosListado.tsx#L133)

---

### Obs-012 — UAT con rol GERENTE_PLANTA confirma fugas de UI privilegiada

- **Severidad:** **Bloqueante** (refuerza Obs-008, Obs-010)
- **Pantalla:** TopNav, `/dashboard`, `/clientes`, `/clientes/nuevo`, `/certificados/nuevo`, `/certificados/:id`
- **Rol afectado:** GERENTE_PLANTA (y por extensión DIRECTOR_OPERACIONES, ASEGURAMIENTO_CALIDAD)
- **Sesión:** login como `gerente@fhesa.mx` el 2026-04-29.
- **¿Qué se observó?**
  1. **TopNav no filtra por rol.** El componente expone los 7 items (`Dashboard`, `Equipos`, `Clientes`, `Lotes`, `Inspecciones`, `Certificados`, `Reportes`) a todos los usuarios autenticados, independientemente del rol. Lista hardcodeada en [TopNav.tsx:5-13](frontend/src/components/layout/TopNav.tsx#L5-L13).
  2. **`/reportes` carga correctamente** — comportamiento esperado para gerente.
  3. **`/clientes` (listado) accesible para gerente.** El backend protege sólo escritura, así que el listado está técnicamente permitido — pero contradice el principio de menor privilegio si la pantalla no está pensada para ese rol.
  4. **`/clientes/nuevo` se renderiza el form completo** para gerente. RBAC bypass confirmado: el form se llena, y sólo al guardar el backend devuelve 403. Mismo síntoma que Obs-008 reportó originalmente para LABORATORIO.
  5. **`/certificados/nuevo`** (wizard de emisión) accesible desde "Acciones rápidas" del dashboard. Por simetría con `/clientes/nuevo` se asume el mismo bypass; **no se verificó hasta el final del wizard**.
  6. **Detalle de `CERT-2026-000003`** muestra correctamente sólo `Descargar PDF` + `Volver` para gerente; los botones `Reenviar` y `Generar ficticia` están gateados por rol y no aparecen. **Esta parte funciona bien** y demuestra que el patrón de gating por rol *sí está aplicado en algunos sitios* — sólo falta extenderlo a la navegación y a los puntos de entrada de los formularios.
- **¿Por qué importa?** Confirma que Obs-008 no es exclusivo de LABORATORIO: cualquier rol no-CONTROL_CALIDAD puede llegar a formularios privilegiados, lo que extiende el alcance del problema y refuerza la prioridad del fix.
- **Cómo reproducirlo:** ver pasos en cada punto del bloque "¿Qué se observó?".
- **Comportamiento esperado:**
  - GERENTE_PLANTA debería ver en TopNav sólo: Dashboard, Reportes (y, opcionalmente, una vista de sólo-lectura de Lotes/Inspecciones para contexto operativo).
  - El dashboard no debería mostrarle acciones de escritura.
  - La navegación directa por URL a rutas privilegiadas debería rebotar a `/dashboard` con un toast informativo.
- **Sugerencia técnica:** Misma propuesta que Obs-008, abordada como un solo cambio coordinado:
  1. Filtrar `navItems` en `TopNav.tsx` con un mapa `rol → items[]`.
  2. Envolver rutas con `<RoleRoute roles={...}>` en `AppRoutes.tsx`.
  3. Filtrar las "Acciones rápidas" en `Dashboard.tsx` por rol.
- **Referencia código:**
  - TopNav sin filtro: [frontend/src/components/layout/TopNav.tsx:5](frontend/src/components/layout/TopNav.tsx#L5)
  - Router sin guard de rol: [frontend/src/routes/AppRoutes.tsx](frontend/src/routes/AppRoutes.tsx)
  - Patrón de gating *que sí funciona* (referencia para replicar): [frontend/src/pages/certificados/CertificadoDetalle.tsx:23](frontend/src/pages/certificados/CertificadoDetalle.tsx#L23)
- **Relacionado con:** Obs-008, Obs-010, Obs-013.

---

### Obs-013 — UAT con rol DIRECTOR_OPERACIONES: mismos síntomas que gerente, con un acierto en `/inspecciones`

- **Severidad:** **Bloqueante** (refuerza Obs-008, Obs-010, Obs-012)
- **Pantalla:** TopNav, `/dashboard`, `/reportes`, `/inspecciones`, `/lotes/nuevo`, `/equipos/nuevo`, `/certificados/:id`
- **Rol afectado:** DIRECTOR_OPERACIONES
- **Sesión:** login como `director@fhesa.mx` el 2026-04-29.
- **¿Qué se observó?**
  1. **TopNav muestra los 7 items** (idéntico a gerente — fuga confirmada).
  2. **Dashboard idéntico** a gerente: mismos KPIs y todas las "Acciones rápidas" visibles → bypass posible desde aquí.
  3. **`/reportes`** muestra exactamente lo mismo que vio gerente (sin diferenciación por rol; esperaríamos vista ejecutiva para director).
  4. **`/inspecciones` (listado)** deja entrar, pero el botón **"Nueva inspección" NO aparece** para director. **Acierto** — es el segundo punto donde el gating por rol *sí* está aplicado (junto con el detalle de certificado). Patrón a replicar en el resto.
  5. **`/lotes/nuevo`** se renderiza el form completo (bypass por URL directa confirmado).
  6. **Detalle de `CERT-2026-000003`**: sólo `Descargar PDF` + `Volver`. Comportamiento correcto, igual que gerente.
  7. **`/equipos/nuevo`** se renderiza el form completo (bypass por URL directa confirmado).
- **¿Por qué importa?** Cierra el círculo de la evidencia: el mismo patrón de fuga de UI se observa en **3 roles distintos** (LAB inferido, GERENTE confirmado, DIRECTOR confirmado — calidad ya cubierto en sesión previa). El bypass por URL afecta como mínimo a `/clientes/nuevo`, `/lotes/nuevo` y `/equipos/nuevo`. Cualquier corrección parcial (sólo un módulo) sería insuficiente.
- **Cómo reproducirlo:** ver pasos en cada punto del bloque "¿Qué se observó?".
- **Comportamiento esperado:** mismo que Obs-008/Obs-012, aplicado consistentemente a los tres listados (`/clientes`, `/lotes`, `/equipos`) y a la navegación.
- **Sugerencia técnica:** sin cambios respecto a Obs-008/Obs-012; el plan de corrección único cubre los tres hallazgos.

  **Importante:** la excepción positiva del listado de inspecciones (`/inspecciones`) demuestra que ya existe un patrón funcional en el código para ocultar CTAs por rol. Conviene **extraer ese patrón** y replicarlo en los demás listados, en lugar de inventar uno nuevo.
- **Referencia código:**
  - Listado con gating correcto (referencia a replicar): `frontend/src/pages/inspecciones/InspeccionesListado.tsx`
  - Listados sin gating: `LotesListado.tsx`, `EquiposListado.tsx`, `ClientesListado.tsx` (botones de "Nuevo" sin condicional de rol).
- **Relacionado con:** Obs-008, Obs-010, Obs-012.

---

## Plan de ataque sugerido

> Orden propuesto para abordar los hallazgos antes de la entrega final del 2026-05-01. Asume un equipo de ~5 personas con división por especialidad.

### Fase 1 — Bloqueantes (no negociable; son requisito para entregar)

1. **Cluster RBAC frontend** (Obs-008 + Obs-010 + Obs-012 + Obs-013) — **un solo PR coordinado**
   - Tocar: `TopNav.tsx`, `AppRoutes.tsx`, `Dashboard.tsx`, listados `*Listado.tsx`.
   - Patrón a replicar: el gating ya implementado en `InspeccionesListado.tsx` y en `CertificadoDetalle.tsx:23`.
   - Estimación: 0.5 día.

2. **Detalle de lote** (Obs-003) — pantalla nueva
   - Crear `LoteDetalle.tsx` + ruta. Backend ya provee `GET /lotes/:id`.
   - Estimación: 0.5 día (sin gráficas; sólo tabla de inspecciones y lista de certificados).

3. **Control de inventario por lote** (Obs-006) — regla de dominio en backend
   - Calcular saldo y validar al crear certificado.
   - Exponer endpoint `GET /lotes/:id/saldo` para consumir desde el wizard.
   - Estimación: 1 día (incluye prueba de integración).

**Total estimado fase 1:** ~2 días-persona si se paralelizan; ~3-4 días-persona en serie.

### Fase 2 — Bugs visuales del PDF (Obs-007)

- Bug 4 (desviación contra rango cliente) tiene prioridad alta porque transmite información incorrecta al cliente.
- Bugs 1, 2, 3 son cosméticos pero embarazosos.
- Estimación: 0.5 día para los cuatro juntos.

### Fase 3 — Mejoras UX no-bloqueantes (si queda tiempo)

Por orden sugerido de mayor a menor valor:

- Obs-005 (atajo "Crear lote" en modal) — alto valor, bajo costo.
- Obs-001 (autocomplete lote en inspección) — alto valor, costo medio.
- Obs-009 (icono de "Generar ficticia") — bajo costo, mejora claridad.
- Obs-011 (acción "Reenviar" en detalle de certificado) — bajo costo, consistencia.
- Obs-004 (etiqueta "Estado vs. rango internacional") — bajo costo.
- Obs-002 (acordeón de equipos en form de inspección) — costo medio, valor depende del tamaño del catálogo.
- Obs-010 (dashboards diferenciados por rol) — alto costo, alto valor — probablemente se queda como deuda para post-entrega.

---

## Plantilla para nuevos hallazgos

```markdown
### Obs-NNN — Título corto

- **Severidad:** Bloqueante | No-bloqueante | Cosmético
- **Pantalla:** ruta o módulo
- **Rol(es) afectado(s):** rol(es) que lo encuentra(n)
- **¿Qué se observó?** descripción narrativa
- **¿Por qué importa?** impacto en negocio o usuario
- **Cómo reproducirlo:** pasos
- **Comportamiento esperado:** qué debería pasar
- **Sugerencia técnica:** propuesta de fix
- **Referencia código:** `archivo.ext:linea`
- **Relacionado con:** Obs-XXX (si aplica)
```
