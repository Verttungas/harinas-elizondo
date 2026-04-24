# Guía de Pruebas de Integración

## 1. Objetivo

Verificar que los endpoints HTTP del backend funcionan correctamente **contra una base de datos real**, incluyendo los triggers y restricciones de negocio definidos en la segunda migración (`business_constraints_and_triggers`). Las pruebas de integración detectan problemas que las unitarias no pueden: mala configuración de Prisma, triggers con nombres de columna equivocados, fallos de autenticación JWT, respuestas HTTP con formato incorrecto, etc.

## 2. Alcance

| Área | Archivo | Escenarios principales |
|---|---|---|
| Autenticación | `auth.test.ts` | Login válido/inválido, bloqueo tras 5 intentos, `/auth/me` con y sin token, logout y bitácora |
| Equipos | `equipos.test.ts` | CRUD completo, permisos por rol, parámetros, clave duplicada, inactivación |
| Clientes | `clientes.test.ts` | Alta con RFC válido, valores de referencia dentro del rango internacional (RN-12), duplicados, inactivar/reactivar |
| Inspecciones | `inspecciones.test.ts` | Secuencia A-Z automática, validación de parámetros, **ficticias con justificación**, rechazo por valores idénticos, límite Z (26 inspecciones) |
| Certificados | `certificados.test.ts` | Emisión end-to-end con PDF generado, envíos creados en BD, inspección fuera del lote, permisos |

## 3. Herramientas

| Herramienta | Rol |
|---|---|
| Jest | Test runner |
| Supertest | Cliente HTTP sobre la instancia `app` de Express sin `listen()` |
| PrismaClient | Acceso directo a la BD para seed / verificación |
| Esquema `testing` en PostgreSQL | Aislamiento: los datos de pruebas no contaminan el esquema `public` de desarrollo |

## 4. Arquitectura de aislamiento

Las pruebas de integración usan un **esquema separado** en la misma base de datos PostgreSQL. La variable `DATABASE_URL` en `backend/.env.test` define:

```
postgresql://fhesa:fhesa@database:5432/fhesa?schema=testing
```

El script `tests/helpers/setup-test-db.ts`:
1. Ejecuta `DROP SCHEMA IF EXISTS testing CASCADE` y recrea el esquema limpio.
2. Ejecuta `prisma migrate deploy` apuntando a ese esquema — aplica las dos migraciones (tablas + triggers).

Este script se invoca **una vez antes de correr los tests de integración** vía `npm run test:setup-db`.

Entre archivos de prueba, el helper `resetTestDb()` borra todos los registros (en orden de llaves foráneas) pero no toca las tablas ni los triggers. Esto mantiene los tests rápidos.

## 5. Criterios de calidad cubiertos

- **FQ-06**: contribuye a la cobertura global ≥ 40 %.
- **FQ-20**: indirectamente, al mantener aislados los datos de prueba, previene que una prueba ensucie la BD que usa el equipo en desarrollo.
- **RN-12** (rango de cliente contenido en rango internacional): validado explícitamente en `clientes.test.ts`.
- **RN-22** (secuencia A-Z de inspecciones): validado en `inspecciones.test.ts` incluyendo el caso límite de intentar la inspección 27.

## 6. Estructura de archivos

```
backend/
├── .env.test                                     # DATABASE_URL → schema=testing
├── tests/
│   ├── helpers/
│   │   ├── auth.ts                               # loginAs(app, correo) → token
│   │   ├── db.ts                                 # resetTestDb, seedMinimalUsers, seedDatosInspecciones
│   │   ├── factories.ts                          # builders para CrearEquipoInput, CrearClienteInput
│   │   └── setup-test-db.ts                      # idempotente: drop + recreate schema + migrate deploy
│   └── integration/
│       ├── auth.test.ts
│       ├── equipos.test.ts
│       ├── clientes.test.ts
│       ├── inspecciones.test.ts
│       └── certificados.test.ts
```

## 7. Cómo ejecutar

```bash
# Primera vez o tras cambios en migrations/: preparar el esquema testing
docker compose exec backend npm run test:setup-db

# Ejecutar todos los tests de integración (secuencialmente con --runInBand)
docker compose exec backend npm run test:integration

# Todo junto (unitarias + integración) con reporte de cobertura
docker compose exec backend npm run test:coverage
```

## 8. Cómo interpretar los resultados

- Salida típica: `PASS tests/integration/<archivo>.test.ts` seguida de un detalle jerárquico de `describe` / `it`.
- Si un test falla por un trigger, verás en la consola un mensaje de `prisma:error` con el texto en español levantado por `RAISE EXCEPTION` (ver migración). Esos mensajes son **esperados** cuando el test valida un caso de error; indican que el trigger se disparó.
- Un test fallido por conexión indica que el esquema `testing` no fue preparado: correr `npm run test:setup-db`.

## 9. Matriz caso de uso → prueba de integración

| Caso de uso | Archivo | Tests destacados |
|---|---|---|
| UC-00 Iniciar sesión | `auth.test.ts` | Todos los escenarios de login + bloqueo |
| UC-01 Alta equipo | `equipos.test.ts` | 201 con parámetros, 409 duplicado, 400 validaciones |
| UC-02 Editar equipo | `equipos.test.ts` | Actualizar descripción vía PUT |
| UC-03 Inactivar equipo | `equipos.test.ts` | 200 con motivo |
| UC-04 Alta cliente | `clientes.test.ts` | RFC válido, correo requerido si requiereCertificado |
| UC-05 Valores de referencia | `clientes.test.ts` | **RN-12** dentro de rango internacional |
| UC-06 Inactivar cliente | `clientes.test.ts` | Inactivar / reactivar |
| UC-07 Registrar inspección | `inspecciones.test.ts` | Secuencia A-B automática (trigger) |
| UC-08 Cerrar inspección | `inspecciones.test.ts` (implícito) | Estado CERRADA al crear |
| UC-09 Ver resultados | `inspecciones.test.ts` | GET con resultados y parámetros |
| UC-10 Inspección ficticia | `inspecciones.test.ts` | Con justificación, rechazo por idénticos |
| UC-11 Ver secuencia A-Z | `inspecciones.test.ts` | Límite Z (describe secuencia A-Z) |
| UC-12 Emitir certificado | `certificados.test.ts` | Con PDF, envíos creados |
| UC-13 Descargar PDF | `certificados.test.ts` | Content-type application/pdf |

Ver `matriz-casos-prueba.md` para el mapa completo.
