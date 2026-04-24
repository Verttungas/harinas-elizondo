# Matriz de Trazabilidad: Casos de Uso ↔ Pruebas

Documento maestro que mapea los 14 casos de uso de la Entrega 2 contra los cuatro niveles de prueba: unitaria, integración, E2E y UAT. Usarlo como índice al evaluar cobertura funcional.

## Leyenda

- **✓** — Cubierto por el nivel indicado.
- **—** — No aplica en ese nivel (por definición).
- **(parcial)** — Parte del caso está cubierta; los detalles están en la guía correspondiente.

## Matriz principal

| UC | Nombre | Unitaria | Integración | E2E | UAT (script) |
|---|---|---|---|---|---|
| UC-00 | Iniciar sesión | `auth.service.test.ts` · `auth.schemas.test.ts` | `auth.test.ts` | `auth.spec.ts` | `guia-uat.md §UC-00` |
| UC-01 | Alta de equipo | `equipos.schemas.test.ts` | `equipos.test.ts` → POST /equipos | `equipos.spec.ts` | `guia-uat.md §UC-01` |
| UC-02 | Editar equipo | `equipos.schemas.test.ts` (parcial) | `equipos.test.ts` (parcial) | — | `guia-uat.md §UC-02` |
| UC-03 | Inactivar equipo | — | `equipos.test.ts` → inactivar | — | `guia-uat.md §UC-03` |
| UC-04 | Alta de cliente | `clientes.schemas.test.ts` | `clientes.test.ts` → POST /clientes | — | `guia-uat.md §UC-04` |
| UC-05 | Valores de referencia (RN-12) | `clientes.schemas.test.ts` | `clientes.test.ts` → valores-referencia (dentro/fuera de rango, duplicado) | — | `guia-uat.md §UC-05` |
| UC-06 | Inactivar / reactivar cliente | — | `clientes.test.ts` → inactivar / reactivar | — | `guia-uat.md §UC-06` |
| UC-07 | Registrar inspección inicial | `inspecciones.schemas.test.ts` | `inspecciones.test.ts` → POST /lotes/:id/inspecciones | — | `guia-uat.md §UC-07` |
| UC-08 | Cerrar inspección | `inspecciones.schemas.test.ts` | `inspecciones.test.ts` (implícito en create con estado CERRADA) | — | `guia-uat.md §UC-08` |
| UC-09 | Consultar resultados | — | `inspecciones.test.ts` → GET /inspecciones/:id | — | `guia-uat.md §UC-09` |
| UC-10 | Inspección ficticia | `inspecciones.schemas.test.ts` | `inspecciones.test.ts` → ficticia (justificación, idénticos) | — | `guia-uat.md §UC-10` |
| UC-11 | Ver secuencia A-Z de un lote | — | `inspecciones.test.ts` → límite Z (27 rechaza) | — | `guia-uat.md §UC-11` |
| UC-12 | Emitir certificado | `certificados.numbering.test.ts` | `certificados.test.ts` → POST /certificados + PDF | `certificados.spec.ts` | `guia-uat.md §UC-12` |
| UC-13 | Descargar PDF | — | `certificados.test.ts` → GET /certificados/:id/pdf | — | `guia-uat.md §UC-13` |
| UC-14 | Reportes / indicadores | — | (no cubierto; reportes se validan en UAT) | — | `guia-uat.md §UC-14` |

## Reglas de negocio destacadas

| Regla | Descripción | Cubierta por |
|---|---|---|
| RN-06 | Parámetros: limite_inferior < limite_superior | `equipos.schemas.test.ts`, CHECK constraint en BD (verificado por integración) |
| RN-12 | Rangos de cliente contenidos en rango internacional | `clientes.test.ts` (trigger plpgsql) |
| RN-22 | Secuencia A-Z de inspecciones | `inspecciones.test.ts` (trigger + describe secuencia A-Z) |
| RN-23 | Máximo 26 inspecciones por lote | `inspecciones.test.ts` → límite Z |
| RN-24 | Cálculo automático de desviación y dentro_especificacion | Trigger (verificado al leer resultados en GET /inspecciones/:id) |
| RN-27 | Inspección ficticia no puede tener valores idénticos al origen | `inspecciones.test.ts` → FICTICIA_RESULTADOS_IDENTICOS |
| RN-28 | Inspección ficticia requiere justificación ≥ 10 caracteres | `inspecciones.schemas.test.ts`, `inspecciones.test.ts` |

## Criterios de calidad (FQ)

| ID | Descripción | Nivel que lo cubre | Evidencia |
|---|---|---|---|
| FQ-05 | Cobertura de pruebas en capa de dominio ≥ 70 % | Unitaria | Umbral en `jest.config.js`; CI falla si no se cumple |
| FQ-06 | Cobertura global de código ≥ 40 % | Unitaria + Integración | Umbral en `jest.config.js`; `npm run test:coverage` reporta |
| FQ-17 | Tipado estático 100 % | Unitaria + Integración | `strict: true` en todos los tsconfig; tests también en TS |
| FQ-20 | Capa de dominio ejecutable sin BD ni servidor | Unitaria | Los tests de `src/domain/` usan sólo objetos JS |

## Cómo usar esta matriz

- **Al agregar un nuevo caso de uso**: crear fila nueva y añadir al menos un nivel de prueba antes de cerrar la tarea.
- **Al refactorizar un módulo**: revisar que los tests referenciados sigan pasando y actualizar esta matriz si cambian archivos.
- **Al preparar la entrega final**: imprimir esta matriz junto con la guía UAT; es el anexo que el profesor usa para validar cobertura.

## Estado general a fecha 2026-04-23

| Nivel | Archivos | Tests totales | Estado |
|---|---|---|---|
| Unitaria | 10 archivos | 71 tests | ✓ 100 % pasan |
| Integración | 5 archivos | 51 tests | ✓ 100 % pasan |
| E2E | 3 archivos (Playwright) | 7 tests | Pendiente de ejecutar en host (Chromium no soporta Alpine) |
| UAT | 14 scripts manuales | — | Pendiente de ejecución con profesor |
