# Guía de Pruebas de Aceptación del Usuario (UAT)

> Documento orientado al evaluador humano. Cada script es un guion reproducible paso por paso. Al ejecutarlo, el evaluador marca el resultado en la sección 4 (Registro de resultados).

## 1. Objetivo

Validar, con usuarios finales (o el profesor en rol de usuario final), que el Sistema de Emisión de Certificados de Calidad — FHESA **cumple los 14 casos de uso** y las reglas de negocio definidas en la Entrega 2. A diferencia de las pruebas automatizadas, las UAT confirman aspectos subjetivos: claridad de mensajes, ergonomía del wizard, legibilidad del PDF, etc.

## 2. Ambiente

### 2.1. URLs

| Servicio | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend (salud) | `http://localhost:3000/api/v1/health` |
| MailHog (bandeja) | `http://localhost:8025` |
| Prisma Studio (opcional) | `http://localhost:5555` |

### 2.2. Credenciales por rol (seed)

| Correo | Contraseña | Rol |
|---|---|---|
| `lab@fhesa.mx` | `fhesa123` | Laboratorio |
| `control@fhesa.mx` | `fhesa123` | Control de calidad |
| `calidad@fhesa.mx` | `fhesa123` | Aseguramiento de calidad |
| `gerente@fhesa.mx` | `fhesa123` | Gerente de planta |
| `director@fhesa.mx` | `fhesa123` | Director de operaciones |

### 2.3. Preparación previa

1. En la raíz del repositorio ejecutar `docker compose up -d`.
2. Esperar ~30 s a que el backend termine de aplicar migraciones y seed.
3. Verificar `curl http://localhost:3000/api/v1/health` retorna `{"status":"ok"}`.
4. Abrir navegador en `http://localhost:5173` y MailHog en `http://localhost:8025`.

## 3. Procedimiento (14 scripts, uno por caso de uso)

---

### UC-00 — Iniciar sesión

**Actor:** Cualquier usuario
**Precondiciones:** El usuario existe y está activo en la BD (seed).

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir `/login` | Se muestra el formulario con logo FHESA |
| 2 | Ingresar `control@fhesa.mx` y `fhesa123` | Botón "Iniciar sesión" activo |
| 3 | Clic en "Iniciar sesión" | Redirige a `/dashboard`, muestra "Carlos Méndez" en esquina superior derecha |
| 4 | Ingresar credenciales inválidas | Muestra toast/mensaje con "Credenciales inválidas" |
| 5 | Repetir paso 4 cinco veces | Al quinto intento el mensaje cambia a "Cuenta temporalmente bloqueada" |

**Criterio de éxito:** los cinco pasos producen el resultado esperado.

---

### UC-01 — Alta de equipo de laboratorio

**Actor:** Control de calidad
**Precondiciones:** Sesión iniciada con `control@fhesa.mx`.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a "Equipos" en el menú | Se lista ALV-001 y FAR-001 del seed |
| 2 | Clic en "Nuevo equipo" | Se abre el formulario |
| 3 | Capturar clave `ALV-UAT-01`, descripción corta, marca, etc. | Los campos aceptan la entrada |
| 4 | Clic en "Agregar parámetro", llenar W / Fuerza panadera / `x10⁻⁴ J` / 150 / 400 | Dialog guarda el parámetro y aparece en la tabla |
| 5 | Clic en "Crear" | Redirige al listado, ALV-UAT-01 aparece al inicio |

**Criterio de éxito:** los cinco pasos producen el resultado esperado.

---

### UC-02 — Editar equipo existente

**Actor:** Control de calidad
**Precondiciones:** Existe ALV-UAT-01.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Clic en ALV-UAT-01 en el listado | Se abre el formulario en modo edición (clave no editable) |
| 2 | Cambiar "descripción corta" a "ALV actualizado" | Campo acepta el cambio |
| 3 | Guardar | Toast "Equipo actualizado", la nueva descripción aparece en listado |

---

### UC-03 — Inactivar equipo

**Actor:** Control de calidad

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En el detalle del equipo, clic en "Inactivar" | Dialog solicita motivo |
| 2 | Escribir "Mantenimiento programado" y confirmar | Estado del equipo pasa a INACTIVO, motivo queda registrado |
| 3 | Filtrar listado por "INACTIVO" | El equipo aparece |

---

### UC-04 — Alta de cliente

**Actor:** Control de calidad

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a Clientes → Nuevo | Abre el formulario |
| 2 | Capturar clave SAP, nombre, RFC válido (ej. `XYZ010101AB1`), correo de contacto | Campos aceptan |
| 3 | Dejar "requiere certificado" marcado | Checkbox marcado |
| 4 | Intentar guardar sin correo de contacto | Error 422 indicando correo requerido |
| 5 | Agregar correo y guardar | Cliente creado, redirige al listado |

---

### UC-05 — Valores de referencia por cliente (RN-12)

**Actor:** Control de calidad
**Precondiciones:** Cliente creado en UC-04.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En detalle del cliente, sección "Valores de referencia", clic en "Agregar" | Dialog con dropdown de parámetros |
| 2 | Elegir parámetro W (rango internacional [150,400]) con límite inferior 200 y superior 350 | Se guarda correctamente |
| 3 | Intentar capturar límite inferior 100 y superior 450 (fuera de rango) | Error: "El rango definido está fuera del rango internacional del parámetro" |

---

### UC-06 — Inactivar cliente

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Clic en "Inactivar" en el detalle | Pide motivo |
| 2 | Confirmar con motivo | Cliente pasa a INACTIVO |

---

### UC-07 — Registrar inspección inicial (secuencia A)

**Actor:** Laboratorio
**Precondiciones:** Sesión con `lab@fhesa.mx`. Existe lote L-2026-001.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a Lotes → L-2026-001 → "Nueva inspección" | Formulario con parámetros del equipo |
| 2 | Capturar fecha, valores para W=280, P=70, L=120, P/L=0.60 | Formulario válido |
| 3 | Guardar como cerrada | Inspección creada con secuencia "A" |

---

### UC-08 — Cerrar inspección

**Actor:** Laboratorio
**Precondiciones:** Existe inspección en estado BORRADOR.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir inspección en borrador | Botón "Cerrar" visible |
| 2 | Clic en "Cerrar" | Cambia a estado CERRADA, botones de edición desaparecen |

---

### UC-09 — Consultar resultados de inspección

**Actor:** Aseguramiento de calidad

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a Inspecciones | Listado paginado con columna secuencia y estado |
| 2 | Abrir inspección del lote L-2026-003 secuencia A (fuera de spec) | Los valores fuera de rango se resaltan en rojo |

---

### UC-10 — Inspección ficticia

**Actor:** Control de calidad
**Precondiciones:** Inspección A cerrada y fuera de especificación.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir inspección origen | Botón "Crear ficticia" visible |
| 2 | Capturar justificación ≥ 10 caracteres y valores distintos al origen | Formulario válido |
| 3 | Guardar | Nueva inspección con `esFicticia=true`, secuencia siguiente (B/C/...), apunta al origen |
| 4 | Intentar crear ficticia con valores idénticos | Error `FICTICIA_RESULTADOS_IDENTICOS` |

---

### UC-11 — Ver secuencia A-Z de un lote

**Actor:** Aseguramiento de calidad

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir detalle del lote | Timeline visual con las inspecciones en orden A,B,C,... |
| 2 | Cada inspección muestra si es ficticia (indicador visual) | Icono o badge visible para las ficticias |

---

### UC-12 — Emitir certificado de calidad

**Actor:** Control de calidad
**Precondiciones:** Cliente Bimbo con valores de referencia. Lote L-2026-001 con inspección A cerrada.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a Certificados → "Emitir certificado" | Paso 1: buscar cliente |
| 2 | Buscar "Bimbo", seleccionar | Paso 1 completo, pasar al Paso 2 |
| 3 | Capturar lote L-2026-001, seleccionar inspección A | Paso 2 completo |
| 4 | Capturar orden de compra, cantidades (entrega ≤ solicitada), factura, fechas | Paso 3 completo |
| 5 | Revisar resumen, clic en "Emitir" | Redirige a detalle con número `CERT-2026-NNNNNN` |
| 6 | Abrir MailHog (`http://localhost:8025`) | Se ven dos correos (cliente + almacén), con PDF adjunto |

**Criterio de éxito:** el certificado se emite y los correos llegan con el PDF adjunto.

---

### UC-13 — Descargar PDF del certificado

**Actor:** Control de calidad

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | En detalle del certificado, clic en "Descargar PDF" | Descarga `CERT-2026-NNNNNN.pdf` |
| 2 | Abrir el PDF | Contiene número, cliente, lote, resultados, firma, logo |

---

### UC-14 — Reportes / indicadores operativos

**Actor:** Gerente de planta / Director de operaciones

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ingresar con `gerente@fhesa.mx` | Dashboard muestra KPIs: certificados emitidos, lotes en especificación, etc. |
| 2 | Ir a Reportes | Gráficas y tablas responden a filtros por fecha |
| 3 | Cambiar rol a director | Mismos reportes pero con mayor agregación (si aplica) |

## 4. Registro de resultados

| UC | Script | Resultado | Fecha | Evaluador | Observaciones |
|---|---|---|---|---|---|
| UC-00 | Iniciar sesión | ☐ Aprobado ☐ Rechazado | | | |
| UC-01 | Alta equipo | ☐ Aprobado ☐ Rechazado | | | |
| UC-02 | Editar equipo | ☐ Aprobado ☐ Rechazado | | | |
| UC-03 | Inactivar equipo | ☐ Aprobado ☐ Rechazado | | | |
| UC-04 | Alta cliente | ☐ Aprobado ☐ Rechazado | | | |
| UC-05 | Valores de referencia | ☐ Aprobado ☐ Rechazado | | | |
| UC-06 | Inactivar cliente | ☐ Aprobado ☐ Rechazado | | | |
| UC-07 | Registrar inspección | ☐ Aprobado ☐ Rechazado | | | |
| UC-08 | Cerrar inspección | ☐ Aprobado ☐ Rechazado | | | |
| UC-09 | Consultar resultados | ☐ Aprobado ☐ Rechazado | | | |
| UC-10 | Inspección ficticia | ☐ Aprobado ☐ Rechazado | | | |
| UC-11 | Ver secuencia A-Z | ☐ Aprobado ☐ Rechazado | | | |
| UC-12 | Emitir certificado | ☐ Aprobado ☐ Rechazado | | | |
| UC-13 | Descargar PDF | ☐ Aprobado ☐ Rechazado | | | |
| UC-14 | Reportes | ☐ Aprobado ☐ Rechazado | | | |

## 5. Criterios globales de aceptación

El sistema se considera **aceptado** cuando:

1. Los 14 scripts de UAT están aprobados.
2. `./run-tests.sh` en la raíz del repositorio pasa sin errores.
3. La cobertura de pruebas reportada cumple FQ-05 (≥ 70 % dominio) y FQ-06 (≥ 40 % global).
4. El evaluador confirma que los mensajes en pantalla son claros, en español y consistentes con el glosario de la Entrega 1.

## 6. Pruebas de performance (fuera de alcance automatizado)

El equipo recomienda incluir, como prueba manual complementaria:

- **Carga de listados**: con 500 certificados en la BD, el listado paginado responde en ≤ 1 s.
- **Emisión de certificado**: desde clic en "Emitir" hasta PDF generado ≤ 3 s.
- **Envío de correos**: MailHog recibe los dos correos ≤ 5 s después de emitir.

Estos umbrales fueron definidos en la ficha de calidad (FQ-11, FQ-12). Si se requiere una prueba automatizada de performance, el equipo sugiere `k6` en una futura iteración.
