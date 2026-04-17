# Fase E — Backend: Flujos Complejos (Inspecciones, Certificados, Reportes)

## Prerrequisitos

- Fases A, B, C y D completadas.
- `docker compose up -d` levanta los cuatro servicios sin errores.
- `GET /api/v1/health` responde 200 con `database: "ok"`.
- Los módulos `auth`, `equipos`, `clientes`, `productos` y `lotes` funcionan (verificable con `curl`).
- El seed cargó 5 usuarios, 3 productos, 2 equipos (9 parámetros), 3 clientes, 3 lotes, 5 inspecciones, 20 resultados.

## Objetivo

Implementar los tres módulos de negocio más complejos del backend:
1. **Inspecciones** — captura de análisis con secuencia A-Z automática, inspecciones subsecuentes, e inspecciones ficticias (UC-09, UC-10, UC-11).
2. **Certificados** — emisión consolidando una o más inspecciones, generación de PDF, envío de correo con reintentos, reenvío manual (UC-12, UC-13).
3. **Reportes** — KPIs del dashboard, series temporales por parámetro, agregados por cliente, desviaciones por lote, listado de ficticias (UC-14).

Al finalizar esta fase, el backend cubre los 43 endpoints del diseño de API de la Entrega 2.

## Contexto previo

Lee primero `CLAUDE.md` en la raíz. Recuerda las reglas absolutas, especialmente:
- Soft delete en tablas de negocio.
- Validación con Zod antes de controllers.
- Errores tipados de dominio.
- Bitácora en toda operación de escritura.
- Verificar documentación oficial antes de decisiones técnicas específicas.

## Alcance de esta fase (qué SÍ se hace)

- Módulo **inspecciones** con 6 endpoints.
- Módulo **certificados** con 5 endpoints.
- Módulo **reportes** con 6 endpoints.
- Servicio de generación de PDF con **PDFKit** (plantilla del certificado según W-09 de la Entrega 2).
- Servicio de envío de correo con **Nodemailer** apuntando a MailHog.
- Tabla de envíos (`envios_certificado`) poblada con estado y reintentos.
- Volumen Docker `certificados-pdf` para persistir PDFs generados.
- Helpers para generación del número de certificado (`CERT-AAAA-NNNNNN`).
- Tests manuales con `curl` documentados.

## Alcance que NO se hace en esta fase

- No implementes reintentos automáticos programados (cron/job queue). Los reintentos se disparan solo cuando el usuario pulsa "Reenviar" desde el frontend (endpoint de la Fase G/F).
- No implementes firma digital del PDF (fuera de alcance v1).
- No implementes actualización de cliente de SAP (fuera de alcance v1).
- No implementes el frontend.
- No escribas tests automatizados (Fase H).

## Requisitos técnicos específicos

### Dependencias a agregar

En `backend/package.json`:

**Producción:**
- `pdfkit` — generación de PDFs
- `nodemailer` — envío de correos

**Desarrollo:**
- `@types/pdfkit`
- `@types/nodemailer`

Instalar con `docker compose exec backend npm install pdfkit nodemailer` y `docker compose exec backend npm install -D @types/pdfkit @types/nodemailer`.

### Volumen para PDFs

El `compose.yaml` ya tiene declarado el volumen `certificados-pdf`. Verifica que esté montado en el servicio `backend` en la ruta `/app/certificados-pdf`. Si no lo está, agrégalo:

```yaml
backend:
  volumes:
    - ./backend:/app
    - /app/node_modules
    - certificados-pdf:/app/certificados-pdf

volumes:
  pgdata:
  certificados-pdf:
```

### Variables de entorno adicionales

Agregar a `backend/.env.example` y `backend/.env`:

```
# Correo (MailHog en desarrollo)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM=certificados@fhesa.mx
SMTP_FROM_NAME=Certificados FHESA

# Almacenamiento de PDFs
PDF_STORAGE_PATH=/app/certificados-pdf

# URL pública del sistema (para links en correos)
APP_BASE_URL=http://localhost:5173
```

Actualiza `backend/src/config/env.ts` para parsear las nuevas variables con Zod.

### Módulo `inspecciones` (6 endpoints)

#### Endpoints

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | `/inspecciones` | Listar con filtros | Todos |
| GET | `/inspecciones/:id` | Detalle con resultados | Todos |
| POST | `/lotes/:loteId/inspecciones` | Crear inspección inicial o subsecuente | LABORATORIO, CONTROL_CALIDAD |
| PUT | `/inspecciones/:id` | Editar inspección en BORRADOR | LABORATORIO, CONTROL_CALIDAD |
| POST | `/inspecciones/:id/cerrar` | Pasar de BORRADOR a CERRADA | LABORATORIO, CONTROL_CALIDAD |
| POST | `/inspecciones/:id/ficticia` | Generar inspección ficticia | CONTROL_CALIDAD |

El endpoint de creación cuelga de `/lotes/:loteId/inspecciones`, no de `/inspecciones`, porque siempre pertenece a un lote específico. Esta convención de sub-recurso está alineada con REST.

#### Schemas (`inspecciones.schemas.ts`)

```
resultadoInputSchema = {
  parametroId: coerce.bigint,
  valor: number,
}

crearInspeccionSchema = {
  fechaInspeccion: string datetime,     // ISO-8601
  observaciones: string optional,
  resultados: array(resultadoInputSchema) min(1),
  guardarComoBorrador: boolean default(false),
}

actualizarInspeccionSchema = crearInspeccionSchema todo opcional EXCEPTO resultados (puede omitirse si no cambian).

crearFicticiaSchema = {
  justificacion: string min(10),
  resultados: array(resultadoInputSchema) min(1),
}

listInspeccionesQuerySchema = {
  page, limit,
  loteId: coerce.bigint optional,
  estado: enum(["BORRADOR", "CERRADA", "TODOS"]) default("TODOS"),
  esFicticia: coerce.boolean optional,
  desde: string date optional,
  hasta: string date optional,
}
```

#### Service (`inspecciones.service.ts`)

**`list(query, usuarioId)`**: paginación + filtros. Ordenar por `fechaInspeccion DESC`.

**`getById(id)`**: `findUnique` con `include: { lote: { include: { producto: true } }, resultados: { include: { parametro: { include: { equipo: true } } } }, inspeccionOrigen: true }`. Si no existe, `NotFoundError`.

**`crearEnLote(loteId, input, usuarioId)`**:

1. Verificar que el lote existe.
2. El trigger `trg_asignar_secuencia_inspeccion` asigna la letra automáticamente si no se provee. **No envíes `secuencia` desde el código**; deja que el trigger la calcule. Si el trigger lanza excepción (lote llegó a Z), captúrala y tradúcela a `ConflictError` con código `LOTE_SECUENCIA_AGOTADA`.
3. Validar que todos los `parametroId` pertenecen a equipos (existen y están activos). Si alguno no, `ValidationError`.
4. Validar que no haya parámetros duplicados en el array.
5. Dentro de transacción:
   a. Crear la inspección con `estado: input.guardarComoBorrador ? "BORRADOR" : "CERRADA"`.
   b. Crear los `resultados_inspeccion` con `createMany`. El trigger `trg_calcular_resultado_inspeccion` calculará `desviacion` y `dentroEspecificacion`.
   c. Registrar bitácora con acción `CREAR` y detalle `{ loteId, secuencia, esFicticia: false, estado }`.
6. Retornar la inspección con sus resultados.

**`actualizar(id, input, usuarioId)`**:

1. Verificar existencia y que el estado sea BORRADOR (RN-26: solo se pueden editar borradores).
2. Si el estado es CERRADA, lanzar `ConflictError` con código `INSPECCION_CERRADA_INMUTABLE`.
3. Dentro de transacción, actualizar los campos permitidos y, si `input.resultados` está presente, eliminar los existentes y crear los nuevos (el trigger recalculará desviación).
4. Bitácora `ACTUALIZAR`.

**`cerrar(id, usuarioId)`**:

1. Verificar existencia y estado BORRADOR. Si ya está CERRADA, idempotente: retornar OK sin cambiar.
2. Cambiar estado a CERRADA.
3. Bitácora `CERRAR`.

**`crearFicticia(inspeccionOrigenId, input, usuarioId)`**:

1. Verificar que la inspección origen existe y está CERRADA.
2. Validar que `input.resultados` no sea idéntico al de la origen (al menos un valor debe diferir). Si son idénticos, `ValidationError` con mensaje explicativo.
3. Validar que el lote de la origen no haya llegado a Z.
4. Dentro de transacción:
   a. Crear nueva inspección con `esFicticia: true`, `inspeccionOrigenId: <origen>`, `justificacionAjuste: input.justificacion`, `estado: CERRADA` (las ficticias se crean cerradas), `fechaInspeccion: NOW()`.
   b. El trigger asigna la siguiente letra disponible.
   c. Crear los resultados (el trigger calcula desviación).
   d. Bitácora `CREAR_FICTICIA` con detalle `{ inspeccionOrigenId, justificacion }`.
5. Retornar la inspección ficticia creada.

#### Routes

```
router.get("/",
  requireAuth,
  validate({ query: listInspeccionesQuerySchema }),
  listInspecciones);

router.get("/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  getInspeccion);

router.put("/:id",
  requireAuth,
  requireRole("LABORATORIO", "CONTROL_CALIDAD"),
  validate({ params: idParamSchema, body: actualizarInspeccionSchema }),
  actualizarInspeccion);

router.post("/:id/cerrar",
  requireAuth,
  requireRole("LABORATORIO", "CONTROL_CALIDAD"),
  validate({ params: idParamSchema }),
  cerrarInspeccion);

router.post("/:id/ficticia",
  requireAuth,
  requireRole("CONTROL_CALIDAD"),
  validate({ params: idParamSchema, body: crearFicticiaSchema }),
  crearInspeccionFicticia);
```

Y en el módulo `lotes` (actualizar `lotes.routes.ts`):

```
router.post("/:loteId/inspecciones",
  requireAuth,
  requireRole("LABORATORIO", "CONTROL_CALIDAD"),
  validate({ params: loteParamSchema, body: crearInspeccionSchema }),
  crearInspeccionEnLote);  // Este handler llama a inspeccionesService.crearEnLote
```

Importa el controller de inspecciones desde lotes. Para mantener el módulo limpio, puedes exportar un helper desde `inspecciones.controller.ts` que se reutilice en ambos routers.

### Módulo `certificados` (5 endpoints)

#### Endpoints

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | `/certificados` | Listar con filtros | Todos |
| GET | `/certificados/:id` | Detalle con inspecciones consolidadas | Todos |
| GET | `/certificados/:id/pdf` | Descargar PDF | Todos |
| POST | `/certificados` | Emitir certificado | CONTROL_CALIDAD |
| POST | `/certificados/:id/reenviar` | Reintentar envíos pendientes/fallidos | CONTROL_CALIDAD |

#### Schemas

```
emitirCertificadoSchema = {
  clienteId: coerce.bigint,
  loteId: coerce.bigint,
  inspeccionIds: array(coerce.bigint) min(1),
  datosEmbarque: {
    numOrdenCompra: string min(1) max(50),
    cantidadSolicitada: number positive,
    cantidadEntrega: number positive,
    numFactura: string min(1) max(50),
    fechaEnvio: string date,
    fechaCaducidad: string date,  // refine: >= fechaEnvio
  }.refine(d.cantidadEntrega <= d.cantidadSolicitada, "La cantidad a entregar no puede exceder la solicitada"),
}

listCertificadosQuerySchema = {
  page, limit,
  clienteId: coerce.bigint optional,
  loteId: coerce.bigint optional,
  estado: enum(["EMITIDO", "ENVIO_PARCIAL", "ENVIADO", "TODOS"]) default("TODOS"),
  desde: string date optional,
  hasta: string date optional,
  q: string optional,   // busca en numero
}
```

#### Servicios auxiliares

**`backend/src/modules/certificados/certificados.numbering.ts`**

Función `generarNumeroCertificado(prisma)`:

1. Obtener el año actual (AAAA).
2. Contar cuántos certificados existen con ese año (`SELECT COUNT(*) FROM certificados WHERE numero LIKE 'CERT-AAAA-%'`).
3. El siguiente consecutivo es ese count + 1, formateado a 6 dígitos con padding.
4. Retornar `CERT-${AAAA}-${NNNNNN}`.

**Nota sobre concurrencia**: para este proyecto académico, el riesgo de colisión es bajo. Si dos emisiones simultáneas llegaran a generar el mismo número, la restricción UNIQUE en `certificados.numero` lanzará un error de Prisma (P2002) y el controller debe responder 409 sugiriendo reintentar. No implementes una secuencia PostgreSQL dedicada todavía; la opción de la vista materializada `cert_consecutivo_AAAA` queda para v2.

**`backend/src/modules/certificados/pdf.service.ts`**

Clase `CertificadoPdfService` con método `generar(certificadoId: bigint): Promise<string>` que retorna la ruta absoluta del PDF generado.

Requisitos del PDF (basado en W-09 de la Entrega 2):

- Tamaño carta, márgenes 2.5 cm.
- Encabezado con título "FÁBRICA DE HARINAS ELIZONDO, S.A. DE C.V." y número del certificado a la derecha.
- Subtítulo: "CERTIFICADO DE CALIDAD".
- Tres bloques: Cliente, Producto y lote, Datos de embarque.
- Tabla central de resultados con columnas: Parámetro, Unidad, Valor obtenido, Rango aceptable, Desviación, Resultado.
  - Los valores fuera de especificación van en rojo, los demás en verde/negro.
  - Los rangos mostrados son los del cliente si existen, o los internacionales en caso contrario (RN-36).
- Dictamen final: "CUMPLE con las especificaciones" o "NO CUMPLE con las especificaciones".
- Pie con trazabilidad: número de certificado, lote, inspecciones consolidadas, usuario emisor, timestamp.

Ruta de salida: `${env.PDF_STORAGE_PATH}/${AAAA}/${MM}/${numero}.pdf`. Crear directorios si no existen.

**`backend/src/lib/mailer.ts`**

Wrapper sobre Nodemailer:

- Crear transporter con `createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: false, ignoreTLS: true })` (MailHog no usa TLS).
- Exportar función `enviarCorreo({ to, subject, html, attachments? })` que retorna `Promise<{ success: boolean; error?: string }>`.
- Usa `from: "${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`.
- Captura errores; no los relanza — retorna `{ success: false, error }` para que el service los maneje.

**`backend/src/modules/certificados/certificados.service.ts`**

Métodos principales:

**`list(query)`**: paginación + filtros. Incluir `cliente` y `lote` en el select para mostrar nombre y número en el listado.

**`getById(id)`**: detalle con `include: { cliente, lote: { include: { producto: true } }, certificadoInspeccion: { include: { inspeccion: { include: { resultados: { include: { parametro: true } } } } } }, envios, usuarioCreador: { select: { id: true, nombre: true, correo: true } } }`. Si no existe, `NotFoundError`.

**`emitir(input, usuarioId)`**:

1. Validar:
   a. Cliente existe, está ACTIVO, tiene `requiereCertificado: true`. Si no, `UnprocessableEntityError` con código adecuado.
   b. Lote existe.
   c. Todas las inspecciones existen, pertenecen al lote indicado, están CERRADAS.
   d. Fechas del embarque coherentes (ya validado por Zod refine).
2. Generar número con `generarNumeroCertificado(prisma)`.
3. Dentro de transacción:
   a. Crear certificado con `estado: EMITIDO`, `rutaPdf: null` (se actualiza después).
   b. Crear registros `certificado_inspeccion` por cada inspección seleccionada, con `orden` secuencial.
   c. Crear registros en `envios_certificado`:
      - Uno para CLIENTE con `destinatarioCorreo: cliente.contactoCorreo`.
      - Uno para ALMACEN con `destinatarioCorreo: "almacen@fhesa.mx"` (valor desde env, crea nueva variable `WAREHOUSE_EMAIL=almacen@fhesa.mx` en `.env.example`).
      - Ambos con `estado: PENDIENTE`.
   d. Bitácora `EMITIR` con detalle `{ clienteId, loteId, inspecciones: [...ids] }`.
4. Fuera de la transacción (para no mantener la transacción abierta durante I/O lenta):
   a. Generar el PDF con `CertificadoPdfService`.
   b. Actualizar `certificado.rutaPdf` con la ruta del archivo.
   c. Disparar envíos async (NO await aquí para responder rápido al usuario):
      - Para cada envío, invocar `enviarCorreo` y actualizar `envios_certificado.estado` a `ENVIADO` o `FALLIDO` según resultado, con `intentos: 1` y `ultimoError` si falló.
   d. Si ambos envíos éxito → `certificado.estado = ENVIADO`. Si alguno falla → `ENVIO_PARCIAL`.
5. Si la generación del PDF falla, revertir el certificado (`DELETE` y bitácora `EMISION_REVERTIDA`). RN-38: fallo de PDF revierte la emisión.
6. Responder inmediatamente al cliente con el certificado creado. Los estados de envío pueden actualizarse "después"; esto es aceptable porque el diseño es async fire-and-forget (RN-39).

**Implementación del "async fire-and-forget"**: usar `setImmediate(() => enviarYActualizar(...))` después de retornar del service. No bloquea el request HTTP. Los errores dentro del callback deben capturarse y loguearse, nunca dejarse sin manejar.

**`getPdfPath(id)`**:

1. Buscar certificado por id.
2. Si no existe o `rutaPdf` es null, `NotFoundError`.
3. Retornar la ruta absoluta para que el controller haga `res.sendFile(...)`.

**`reenviar(id, usuarioId)`**:

1. Buscar certificado. Si no existe, `NotFoundError`.
2. Obtener envíos en estado `PENDIENTE` o `FALLIDO`.
3. Si no hay envíos para reintentar, `ConflictError` con código `NO_HAY_ENVIOS_PENDIENTES`.
4. Para cada envío pendiente/fallido:
   a. Incrementar `intentos`.
   b. Si `intentos > 3`, marcar permanentemente FALLIDO y no intentar más.
   c. Ejecutar `enviarCorreo`.
   d. Actualizar estado.
5. Recalcular `certificado.estado` (ENVIADO si todos éxito, ENVIO_PARCIAL si alguno falla).
6. Bitácora `REENVIAR`.
7. Retornar el certificado con sus envíos actualizados.

**Rutas** (ya implícitas arriba). Para el endpoint del PDF:

```
router.get("/:id/pdf",
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const ruta = await certificadosService.getPdfPath(BigInt(req.params.id));
      res.sendFile(ruta);
    } catch (err) { next(err); }
  });
```

### Módulo `reportes` (6 endpoints)

Los reportes son consultas agregadas sobre datos existentes. No hay mutación, no hay bitácora (es solo lectura).

#### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/reportes/resumen` | KPIs del mes actual |
| GET | `/reportes/parametros` | Serie temporal por parámetro |
| GET | `/reportes/certificados-por-cliente` | Agregado por cliente |
| GET | `/reportes/desviaciones` | Lotes con % fuera de espec |
| GET | `/reportes/ficticias` | Listado de lotes con ficticias |
| GET | `/reportes/export` | Exportar cualquiera a CSV |

Todos requieren solo `requireAuth` (todos los roles ven reportes).

#### Schemas

```
resumenQuerySchema = {} // sin filtros

parametrosQuerySchema = {
  parametroId: coerce.bigint,
  desde: string date,
  hasta: string date,
  clienteId: coerce.bigint optional,
}

certificadosPorClienteQuerySchema = {
  desde: string date,
  hasta: string date,
}

desviacionesQuerySchema = {
  desde: string date,
  hasta: string date,
  productoId: coerce.bigint optional,
}

ficticiasQuerySchema = {
  desde: string date optional,
  hasta: string date optional,
}

exportQuerySchema = {
  tipo: enum(["parametros", "certificados-por-cliente", "desviaciones", "ficticias"]),
  formato: enum(["csv"]) default("csv"),
  // todos los filtros del tipo correspondiente, pasados por query
}
```

#### Service (`reportes.service.ts`)

**`resumen()`**:

Calcula 4 KPIs:
1. Certificados emitidos en el mes en curso (`count` de `certificados` con `fechaEmision >= first_of_month`).
2. % de lotes en especificación: `(count lotes sin resultados fuera) / (count total de lotes) * 100`. Calcular solo para lotes con al menos una inspección CERRADA en el mes.
3. Clientes activos (`count` de `clientes` con `estado: ACTIVO`).
4. Inspecciones ficticias en el mes (`count` de `inspecciones` con `esFicticia: true AND fechaInspeccion >= first_of_month`).

Retornar:
```json
{
  "certificadosEmitidos": { "valor": 42, "variacionMesAnterior": 12 },
  "lotesEnEspecificacion": { "valor": 96.8, "variacionPuntos": 2.1 },
  "clientesActivos": { "valor": 47 },
  "inspeccionesFicticias": { "valor": 3 }
}
```

**`parametros(query)`**:

Serie temporal de valores del parámetro indicado a lo largo del rango. Para cada inspección en rango:
- Si `query.clienteId` está presente, filtrar por inspecciones que estén en certificados de ese cliente.
- Retornar array de `{ fecha, loteId, numeroLote, secuencia, valor, dentroEspecificacion, esFicticia }`.

Ordenar por fecha ascendente.

**`certificadosPorCliente(query)`**:

```sql
SELECT cliente_id, COUNT(*) AS total
FROM certificados
WHERE fecha_emision BETWEEN $1 AND $2
GROUP BY cliente_id
```

Usar Prisma `groupBy`. Mapear a `{ clienteId, clienteNombre, totalCertificados }`.

**`desviaciones(query)`**:

Para cada lote en rango:
```
total_resultados = total de resultados_inspeccion
fuera = total donde dentro_especificacion = false
porcentaje_fuera = fuera / total * 100
```

Retornar lotes ordenados por `porcentaje_fuera DESC`. Limitar a top 20.

**`ficticias(query)`**:

Listado paginado de inspecciones con `esFicticia: true`. Incluir `lote`, `inspeccionOrigen` y `justificacionAjuste`.

**`exportCsv(query)`**:

Helper que delega al método correspondiente según `query.tipo`, y mapea el resultado a CSV con `csv-stringify/sync` (si no está instalado, instálalo). Retornar el string CSV. El controller lo envía con headers `Content-Type: text/csv` y `Content-Disposition: attachment`.

### Actualización del router raíz

En `backend/src/routes/index.ts`:

```ts
import inspeccionesRouter from "../modules/inspecciones/inspecciones.routes.js";
import certificadosRouter from "../modules/certificados/certificados.routes.js";
import reportesRouter from "../modules/reportes/reportes.routes.js";

apiRouter.use("/inspecciones", inspeccionesRouter);
apiRouter.use("/certificados", certificadosRouter);
apiRouter.use("/reportes", reportesRouter);
```

## Procedimiento sugerido (bloques con confirmación)

### Bloque 1 — Verificación y dependencias

1. Verifica que las fases previas están completas (listar los módulos actuales de `backend/src/modules/`).
2. Instala dependencias: `pdfkit`, `nodemailer`, `csv-stringify`, y sus `@types/*`.
3. Agrega las nuevas variables de entorno a `backend/.env.example` y `backend/.env`.
4. Verifica que el volumen `certificados-pdf` esté declarado en `compose.yaml`.
5. Si el volumen es nuevo, reinicia: `docker compose down && docker compose up -d`.

### Bloque 2 — Helpers compartidos

Crea los archivos:
- `backend/src/lib/mailer.ts`

Verifica conexión a MailHog haciendo un envío de prueba temporal (puedes removerlo después).

### Bloque 3 — Módulo inspecciones

1. Crea los 4 archivos del módulo.
2. Actualiza `lotes.routes.ts` para agregar `POST /:loteId/inspecciones`.
3. Registra el router en el router raíz.
4. Reinicia backend.
5. Tests manuales con `curl` (obtener token de CONTROL_CALIDAD primero):

   a. **Listar inspecciones**:
```bash
      curl http://localhost:3000/api/v1/inspecciones \
        -H "Authorization: Bearer $TOKEN"
```
      Debe retornar las 5 inspecciones del seed.

   b. **Detalle con resultados**:
```bash
      curl http://localhost:3000/api/v1/inspecciones/1 \
        -H "Authorization: Bearer $TOKEN"
```
      Debe incluir el lote, los 4 resultados y sus parámetros.

   c. **Crear inspección subsecuente**:
```bash
      curl -X POST http://localhost:3000/api/v1/lotes/1/inspecciones \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "fechaInspeccion": "2026-04-17T10:00:00Z",
          "resultados": [
            {"parametroId": 1, "valor": 280},
            {"parametroId": 2, "valor": 70},
            {"parametroId": 3, "valor": 118},
            {"parametroId": 4, "valor": 0.59}
          ]
        }'
```
      Debe crear la inspección con secuencia "B" (lote 1 ya tenía "A") y responder 201.

   d. **Crear inspección ficticia**:
```bash
      curl -X POST http://localhost:3000/api/v1/inspecciones/4/ficticia \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "justificacion": "Segunda revisión por desviación del parámetro W",
          "resultados": [
            {"parametroId": 1, "valor": 210},
            {"parametroId": 2, "valor": 65},
            {"parametroId": 3, "valor": 105},
            {"parametroId": 4, "valor": 0.62}
          ]
        }'
```
      (La inspección 4 del seed es la A de L-2026-003 con valor W fuera de espec; 5 es ya su ficticia B. Esta prueba creará la C.)
      Debe crear inspección con `esFicticia: true`, `inspeccionOrigenId: 4`, `secuencia: "C"`.

   e. **Intentar crear ficticia con resultados idénticos**: enviar los mismos valores que la origen. Debe responder 400 con `VALIDATION_ERROR`.

   f. **Intentar cerrar una inspección ya cerrada**: debe ser idempotente (200 OK sin cambios).

   g. **Intentar actualizar una inspección cerrada**: debe responder 409 con `INSPECCION_CERRADA_INMUTABLE`.

### Bloque 4 — Módulo certificados: servicios de PDF y correo

1. Crea `backend/src/modules/certificados/pdf.service.ts`.
2. Crea `backend/src/modules/certificados/certificados.numbering.ts`.
3. Valida manualmente que la plantilla PDF genera algo razonable creando un test temporal (puedes exponer un endpoint dev `/api/v1/dev/test-pdf` que genere un PDF de prueba y lo guarde).
4. Verifica que el PDF se abre en un visor y tiene el formato esperado.
5. Remueve el endpoint dev.

### Bloque 5 — Módulo certificados: endpoints

1. Crea los 4 archivos del módulo.
2. Registra el router.
3. Reinicia backend.
4. Tests manuales:

   a. **Emitir certificado**:
```bash
      curl -X POST http://localhost:3000/api/v1/certificados \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "clienteId": 1,
          "loteId": 1,
          "inspeccionIds": [1],
          "datosEmbarque": {
            "numOrdenCompra": "PO-TEST-001",
            "cantidadSolicitada": 1000,
            "cantidadEntrega": 1000,
            "numFactura": "F-TEST-001",
            "fechaEnvio": "2026-04-18",
            "fechaCaducidad": "2026-10-18"
          }
        }'
```
      Debe responder 201 con el certificado y número tipo `CERT-2026-000001`.

   b. **Verificar PDF generado**:
```bash
      docker compose exec backend ls /app/certificados-pdf/2026/04/
```
      Debe listar el PDF generado.

   c. **Descargar PDF**:
```bash
      curl http://localhost:3000/api/v1/certificados/1/pdf \
        -H "Authorization: Bearer $TOKEN" \
        -o test-cert.pdf
```
      Abre `test-cert.pdf` en un visor y verifica que el diseño cumple W-09.

   d. **Verificar correos en MailHog**:
      Abre `http://localhost:8025` en navegador. Debe haber 2 correos: uno a `compras@bimbo.fhesa.test` y otro a `almacen@fhesa.mx`, ambos con el PDF adjunto.

   e. **Listar certificados**:
```bash
      curl http://localhost:3000/api/v1/certificados \
        -H "Authorization: Bearer $TOKEN"
```

   f. **Intentar emitir para cliente inactivo**: inactivar un cliente y tratar de emitirle. Debe responder 422.

   g. **Intentar emitir con lote que no tiene inspecciones cerradas**: crear un lote nuevo sin inspecciones, tratar de emitirle. Debe responder 422.

### Bloque 6 — Módulo reportes

1. Crea los 4 archivos del módulo.
2. Registra el router.
3. Tests manuales:

   a. **Resumen**:
```bash
      curl http://localhost:3000/api/v1/reportes/resumen \
        -H "Authorization: Bearer $TOKEN"
```
      Debe retornar los 4 KPIs.

   b. **Serie por parámetro**:
```bash
      curl "http://localhost:3000/api/v1/reportes/parametros?parametroId=1&desde=2026-04-01&hasta=2026-04-30" \
        -H "Authorization: Bearer $TOKEN"
```
      Debe retornar serie temporal de W.

   c. **Ficticias**:
```bash
      curl http://localhost:3000/api/v1/reportes/ficticias \
        -H "Authorization: Bearer $TOKEN"
```
      Debe listar la inspección ficticia del seed (y la que creamos en Bloque 3).

   d. **Export CSV**:
```bash
      curl "http://localhost:3000/api/v1/reportes/export?tipo=ficticias" \
        -H "Authorization: Bearer $TOKEN" \
        -o ficticias.csv
```
      Debe descargar un CSV válido.

### Bloque 7 — Cierre

1. Verifica que `docker compose exec backend npx tsc --noEmit` pasa sin errores.
2. Reporta al humano:
   - Archivos creados.
   - Resultado de tests manuales.
   - PDFs generados correctamente.
   - Correos capturados por MailHog.
3. Sugiere commit: `feat: add inspecciones, certificados and reportes modules (Phase E)`.

## Criterios de éxito de la Fase E

- [ ] Compilación TypeScript sin errores.
- [ ] 43 endpoints del diseño de API están implementados (verificable con `GET /api/v1/` aunque no exista; usar lista manual).
- [ ] Trigger de secuencia A-Z funcionando (al crear inspección sin secuencia, asigna la siguiente letra).
- [ ] Inspección ficticia preservando la original, vinculando `inspeccionOrigenId`, marcando `esFicticia: true`, exigiendo justificación.
- [ ] Emisión de certificado generando número único formato `CERT-AAAA-NNNNNN`.
- [ ] PDF generado con diseño del wireframe W-09.
- [ ] Correos enviados a cliente y almacén capturados por MailHog.
- [ ] Estado de `envios_certificado` actualizándose según resultado.
- [ ] Reportes retornando datos coherentes.
- [ ] Bitácora registrando todas las operaciones de escritura.
- [ ] Autorización funcional: LABORATORIO no puede emitir certificados.

## Si algo falla

- Reporta error literal antes de intentar arreglar.
- Si PDFKit falla con caracteres acentuados, es problema de fonts: registra la fuente explícitamente o usa `doc.font("Helvetica")` que soporta Latin-1.
- Si Nodemailer no conecta a MailHog, verifica que ambos estén en la misma red Docker y que el host sea `mailhog` (nombre del servicio).
- Si el trigger de secuencia falla, hazlo con `psql` directamente: `docker compose exec database psql -U postgres -d fhesa -c "SELECT * FROM inspecciones ORDER BY lote_id, secuencia;"`.
- Si el error es de Prisma con triggers (`P2010`), captúralo específicamente y traduce el mensaje.

## Entregables

```
backend/src/
├── lib/
│   └── mailer.ts                                 (nuevo)
├── modules/
│   ├── inspecciones/
│   │   ├── inspecciones.schemas.ts
│   │   ├── inspecciones.service.ts
│   │   ├── inspecciones.controller.ts
│   │   └── inspecciones.routes.ts
│   ├── certificados/
│   │   ├── certificados.schemas.ts
│   │   ├── certificados.service.ts
│   │   ├── certificados.controller.ts
│   │   ├── certificados.routes.ts
│   │   ├── certificados.numbering.ts
│   │   └── pdf.service.ts
│   └── reportes/
│       ├── reportes.schemas.ts
│       ├── reportes.service.ts
│       ├── reportes.controller.ts
│       └── reportes.routes.ts
├── routes/
│   └── index.ts                                  (actualizado)
└── config/
    └── env.ts                                    (actualizado con SMTP_*, PDF_STORAGE_PATH, APP_BASE_URL, WAREHOUSE_EMAIL)

backend/.env                                       (actualizado)
backend/.env.example                               (actualizado)
backend/package.json                               (actualizado con pdfkit, nodemailer, csv-stringify, @types/*)
compose.yaml                                       (actualizado si el volumen no existía)
```