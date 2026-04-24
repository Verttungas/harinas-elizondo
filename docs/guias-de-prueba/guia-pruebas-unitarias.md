# Guía de Pruebas Unitarias

## 1. Objetivo

Verificar, sin dependencias externas (base de datos, red, sistema de archivos), el comportamiento de la **capa de dominio** y la **lógica de los servicios** del backend. Las pruebas unitarias son la primera línea de defensa y la más económica: se ejecutan en milisegundos y no requieren levantar ningún servicio.

## 2. Alcance

Las pruebas unitarias cubren:

- **Clases de error de dominio** (`src/domain/errors.ts`): código, statusCode y mensaje en español de cada una de las 8 clases.
- **Librerías de soporte** (`src/lib/`): paginación, construcción de filtros de búsqueda, serialización de `BigInt` para JSON.
- **Lógica de negocio de servicios con Prisma mockeado**:
  - `AuthService.login`: credenciales inválidas, cuenta bloqueada, conteo de intentos fallidos, bloqueo automático tras 5 intentos, reset de intentos tras login exitoso.
  - `AuthService.getUserById` / `logLogout`.
  - `generarNumeroCertificado`: formato `CERT-AAAA-NNNNNN`, consecutivo con padding.
- **Validación de schemas Zod**: pruebas de contrato para `loginSchema`, `crearEquipoSchema`, `crearClienteSchema`, `crearInspeccionSchema`, `crearFicticiaSchema`, etc.

No cubren: endpoints HTTP, triggers de BD, generación de PDF, envío de correo. Esos están en la suite de integración o E2E.

## 3. Herramientas

| Herramienta | Versión | Rol |
|---|---|---|
| Jest | 30.x | Test runner + aserciones |
| ts-jest | 29.x | Transformer de TypeScript con soporte ESM |
| `@jest/globals` | — | Mocks tipados (`jest.fn`, `jest.spyOn`) |

Configuración: `backend/jest.config.js` (preset `ts-jest/presets/default-esm`, `testEnvironment: "node"`).

## 4. Criterios de calidad cubiertos

Este archivo forma parte de los criterios definidos en la ficha técnica de la Entrega 1:

- **FQ-05** — Cobertura de pruebas en capa de dominio ≥ 70 %. Umbral aplicado en `jest.config.js` → `coverageThreshold["./src/domain/**/*.ts"].lines: 70`.
- **FQ-06** — Cobertura global de código ≥ 40 %. Umbral `coverageThreshold.global.lines: 40`.
- **FQ-17** — Tipado estático: los tests también están en TypeScript estricto (`strict: true`).
- **FQ-20** — La capa de dominio se ejecuta sin BD ni servidor: todos estos tests corren con Prisma mockeado.

## 5. Estructura de archivos

```
backend/tests/
├── setup.env.ts                    # carga .env.test y NODE_ENV=test
├── setup.ts                        # desconexión de Prisma en afterAll
└── unit/
    ├── domain/
    │   └── errors.test.ts
    ├── lib/
    │   ├── filters.test.ts
    │   ├── json.test.ts
    │   └── pagination.test.ts
    └── modules/
        ├── auth/
        │   ├── auth.schemas.test.ts
        │   └── auth.service.test.ts
        ├── certificados/
        │   └── certificados.numbering.test.ts
        ├── clientes/
        │   └── clientes.schemas.test.ts
        ├── equipos/
        │   └── equipos.schemas.test.ts
        └── inspecciones/
            └── inspecciones.schemas.test.ts
```

## 6. Cómo ejecutar

Con Docker Compose corriendo:

```bash
# Toda la suite unitaria
docker compose exec backend npm run test:unit

# Modo watch (recomendado durante desarrollo)
docker compose exec backend npm run test:watch

# Con reporte de cobertura
docker compose exec backend npm run test:coverage
```

## 7. Cómo interpretar los resultados

- **`PASS <archivo>`**: todas las pruebas del archivo pasaron.
- **`FAIL <archivo>`**: al menos una prueba falló; el runner imprime el diff entre valor esperado y recibido.
- **Reporte de cobertura** (solo con `test:coverage`): se genera en `backend/coverage/`. Se evalúa contra los umbrales `FQ-05` y `FQ-06`. Si cualquiera queda por debajo, Jest retorna código de salida ≠ 0 y rompe el build.

Abrir `backend/coverage/lcov-report/index.html` en el navegador para ver el reporte HTML con líneas no cubiertas resaltadas.

## 8. Matriz caso de uso → prueba unitaria

| Caso de uso | Archivo(s) de prueba unitaria | Qué valida |
|---|---|---|
| UC-00 Iniciar sesión | `auth.service.test.ts`, `auth.schemas.test.ts` | Lógica de bloqueo, validación de credenciales, schema del login |
| UC-01 Alta de equipo | `equipos.schemas.test.ts` | Contrato de entrada: parámetros ≥ 1, límites coherentes, fechas ISO |
| UC-04 Alta de cliente | `clientes.schemas.test.ts` | Formato de RFC, validación de correo de contacto |
| UC-07 Registrar inspección | `inspecciones.schemas.test.ts` | Contrato de entrada: fecha, resultados no vacíos, flag borrador |
| UC-10 Inspección ficticia | `inspecciones.schemas.test.ts` | Justificación mínima 10 caracteres, máximo 1000 |
| UC-12 Emitir certificado | `certificados.numbering.test.ts` | Formato `CERT-AAAA-NNNNNN`, consecutivo con padding a 6 dígitos |
| Infraestructura compartida | `errors.test.ts`, `pagination.test.ts`, `filters.test.ts`, `json.test.ts` | Clases de error, paginación, búsqueda, serialización |

Ver `matriz-casos-prueba.md` para el mapa completo de 14 casos de uso.
