# Fase H — Pruebas: Unitarias, de Integración y End-to-End

## Prerrequisitos

- Fases A–G completadas.
- `docker compose up -d` levanta los cuatro servicios sin errores.
- El frontend responde en `http://localhost:5173` y el backend en `http://localhost:3000/api/v1/health`.
- El login funcional, el wizard de certificado emite PDFs y dispara correos a MailHog.

## Objetivo

Implementar la suite de pruebas que exige el documento de instrucciones de la asignatura:

1. **Pruebas unitarias** (Fase C de la ficha de calidad — FQ-05, FQ-06).
2. **Pruebas de integración** (verifican endpoints end-to-end con base de datos real).
3. **Pruebas E2E** (verifican flujos completos en el navegador).
4. **Guías de prueba** (scripts documentados para reproducir pruebas manuales, obligatorios por el documento de instrucciones).

Al cerrar esta fase, el proyecto tendrá cobertura medible, pruebas automatizadas ejecutables con un solo comando, y los documentos de guía para pruebas de aceptación del usuario.

## Contexto previo

Lee primero `CLAUDE.md` en la raíz. Recuerda las metas de calidad de la Entrega 1:
- **FQ-05**: cobertura de pruebas en capa de dominio ≥ 70%.
- **FQ-06**: cobertura global de código ≥ 40%.
- **FQ-17**: tipado estático en 100% del código.
- **FQ-20**: capa de dominio ejecutable sin BD ni servidor.

## Alcance de esta fase (qué SÍ se hace)

- Configuración de **Jest + ts-jest** para tests unitarios y de integración del backend.
- Suite de **pruebas unitarias** en `backend/tests/unit/` cubriendo:
  - Clases de error de dominio.
  - Lógica de negocio de `AuthService` (sin BD, con mocks).
  - Lógica de cálculo de número de certificado.
  - Validación de schemas Zod (tests de contratos).
- Suite de **pruebas de integración** en `backend/tests/integration/` cubriendo:
  - Endpoints de `auth` (login exitoso, fallos, bloqueo, /me).
  - Endpoints de `equipos` (CRUD completo, roles, unicidad).
  - Endpoints de `clientes` (CRUD, valores de referencia, validación de rangos).
  - Flujo de inspecciones (inicial, subsecuente, ficticia con secuencia A-Z).
  - Emisión de certificado (con PDF generado).
- Configuración de **Playwright** para tests E2E del frontend.
- Suite de **pruebas E2E** cubriendo los tres flujos críticos:
  - Login + navegación + logout.
  - Crear equipo de laboratorio completo con parámetros.
  - Emisión de certificado end-to-end (wizard completo + verificación en MailHog).
- **Guías de prueba** en `docs/guias-de-prueba/` (markdown), una por cada tipo:
  - Guía de pruebas unitarias.
  - Guía de pruebas de integración.
  - Guía de pruebas E2E.
  - Guía de pruebas de aceptación del usuario (UAT).
- Script `run-tests.sh` en la raíz que ejecuta toda la suite.
- Matriz de casos de prueba (`docs/guias-de-prueba/matriz-casos-prueba.md`) mapeando casos de uso → pruebas.

## Alcance que NO se hace en esta fase

- No escribas pruebas de performance (k6, etc.); solo se documentan en la guía UAT.
- No escribas pruebas de seguridad pentesting; solo las básicas (SQL injection, XSS, auth bypass).
- No busques 100% de cobertura; las metas son FQ-05 (≥70%) y FQ-06 (≥40%).

## Requisitos técnicos específicos

### Dependencias a agregar

**Backend — `backend/package.json`:**

Desarrollo:
- `jest`
- `ts-jest`
- `@types/jest`
- `supertest`
- `@types/supertest`

Instalar:

```bash
docker compose exec backend npm install -D jest ts-jest @types/jest supertest @types/supertest
```

Agregar scripts a `backend/package.json`:

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:unit": "jest tests/unit",
  "test:integration": "jest tests/integration",
  "test:coverage": "jest --coverage"
}
```

**Frontend — `frontend/package.json`:**

Desarrollo:
- `@playwright/test`

Instalar:

```bash
docker compose exec frontend npm install -D @playwright/test
docker compose exec frontend npx playwright install --with-deps chromium
```

Agregar scripts a `frontend/package.json`:

```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:report": "playwright show-report"
}
```

### Configuración de Jest

Crear `backend/jest.config.js`:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/config/env.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: 40,
      functions: 40,
    },
    './src/domain/**/*.ts': {
      lines: 70,
    },
    './src/modules/**/*.service.ts': {
      lines: 70,
    },
  },
};
```

### Base de datos de pruebas

Las pruebas de integración requieren una base de datos aislada para no contaminar los datos de desarrollo. Opciones:

**Opción A (recomendada para este proyecto)**: usar un esquema separado en la misma base de datos.
- En `backend/.env.test` definir `DATABASE_URL=postgresql://...?schema=testing`.
- Configurar Prisma para usar ese esquema en modo test.

**Opción B**: servicio adicional en `compose.yaml` con PostgreSQL separado.
- Más limpio, más lento al arrancar.

Implementa **Opción A** para mantenerlo simple. Incluye script `setup-test-db.ts` que limpia y aplica migraciones al esquema `testing` antes de cada suite.

### Estructura de tests del backend

```
backend/
├── jest.config.js
├── tests/
│   ├── setup.ts                      # setup global: carga env, conecta Prisma
│   ├── teardown.ts                   # cierra conexiones
│   ├── helpers/
│   │   ├── db.ts                     # reset de BD de pruebas
│   │   ├── factories.ts              # builders de entidades para tests
│   │   └── auth.ts                   # helper de login para integración
│   ├── unit/
│   │   ├── domain/
│   │   │   └── errors.test.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.test.ts
│   │   │   │   └── auth.schemas.test.ts
│   │   │   ├── certificados/
│   │   │   │   └── certificados.numbering.test.ts
│   │   │   └── equipos/
│   │   │       └── equipos.schemas.test.ts
│   │   └── lib/
│   │       └── format.test.ts
│   └── integration/
│       ├── auth.test.ts
│       ├── equipos.test.ts
│       ├── clientes.test.ts
│       ├── inspecciones.test.ts
│       └── certificados.test.ts
```

### Patrones de tests unitarios

**Tests de clases de error:**

```typescript
describe('DomainError classes', () => {
  it('InvalidCredentialsError tiene statusCode 401 y mensaje en español', () => {
    const err = new InvalidCredentialsError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('INVALID_CREDENTIALS');
    expect(err.message).toMatch(/credenciales/i);
  });

  // Un test similar para cada clase de error
});
```

**Tests de servicios con mocks:**

```typescript
describe('AuthService.login', () => {
  const mockPrisma = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bitacora: { create: jest.fn() },
    $transaction: jest.fn(fn => fn(mockPrisma)),
  };

  beforeEach(() => jest.clearAllMocks());

  it('lanza InvalidCredentialsError cuando el correo no existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    const service = new AuthService(mockPrisma as any);
    await expect(service.login({ correo: 'x@y.com', password: 'x' }))
      .rejects.toThrow(InvalidCredentialsError);
  });

  it('lanza AccountLockedError si el usuario está bloqueado', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 1n,
      correo: 'x@y.com',
      activo: true,
      bloqueadoHasta: new Date(Date.now() + 60000),
      passwordHash: 'hash',
    });
    const service = new AuthService(mockPrisma as any);
    await expect(service.login({ correo: 'x@y.com', password: 'x' }))
      .rejects.toThrow(AccountLockedError);
  });

  it('incrementa intentosFallidos y registra bitácora en login fallido', async () => {
    // ... setup completo, verificar que se llamó update con intentosFallidos: 1
  });

  it('bloquea al usuario después de 5 intentos fallidos', async () => {
    // ...
  });

  it('retorna token y usuario en login exitoso', async () => {
    // ...
  });

  it('resetea intentosFallidos tras login exitoso', async () => {
    // ...
  });
});
```

**Tests de schemas Zod:**

```typescript
describe('loginSchema', () => {
  it('acepta correo válido y password no vacío', () => {
    const result = loginSchema.safeParse({ correo: 'a@b.com', password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rechaza correo con formato inválido', () => {
    const result = loginSchema.safeParse({ correo: 'no-es-correo', password: 'x' });
    expect(result.success).toBe(false);
  });

  // ...
});
```

### Patrones de tests de integración

**Setup con Supertest y BD real (esquema testing):**

```typescript
import request from 'supertest';
import { app } from '../../src/app';  // Exportar `app` sin `listen` desde un archivo separable
import { resetTestDb, seedMinimalData } from '../helpers/db';

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await resetTestDb();
    await seedMinimalData();  // Crea 1 usuario de prueba
  });

  it('200 con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'control@test.mx', password: 'fhesa123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.rol).toBe('CONTROL_CALIDAD');
  });

  it('401 con credenciales inválidas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'control@test.mx', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('INVALID_CREDENTIALS');
  });

  it('400 con correo mal formado', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'no-es-email', password: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDATION_ERROR');
  });

  it('bloquea al usuario tras 5 intentos fallidos', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ correo: 'control@test.mx', password: 'wrong' });
    }
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'control@test.mx', password: 'wrong' });
    expect(res.body.error.codigo).toBe('ACCOUNT_LOCKED');
  });
});
```

**Test de flujo de inspecciones (valida secuencia A-Z):**

```typescript
describe('Flujo de inspecciones', () => {
  let token: string;
  let loteId: bigint;

  beforeAll(async () => {
    await resetTestDb();
    await seedForInspecciones();
    token = await loginAs('control@test.mx');
    loteId = // id de un lote creado en el seed
  });

  it('crea inspección inicial con secuencia A automáticamente', async () => {
    const res = await request(app)
      .post(`/api/v1/lotes/${loteId}/inspecciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fechaInspeccion: new Date().toISOString(),
        resultados: [/* valores válidos */],
      });

    expect(res.status).toBe(201);
    expect(res.body.secuencia).toBe('A');
  });

  it('crea inspección subsecuente con secuencia B', async () => {
    const res = await request(app)
      .post(`/api/v1/lotes/${loteId}/inspecciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ /* ... */ });

    expect(res.body.secuencia).toBe('B');
  });

  it('crea inspección ficticia con justificación', async () => {
    // primero cerrar la inspección A, luego crear ficticia
    const res = await request(app)
      .post(`/api/v1/inspecciones/1/ficticia`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        justificacion: 'Corrección de lectura por falla del equipo',
        resultados: [/* valores diferentes */],
      });

    expect(res.status).toBe(201);
    expect(res.body.esFicticia).toBe(true);
    expect(res.body.inspeccionOrigenId).toBe('1');
  });

  it('falla al crear inspección con resultados idénticos a la origen', async () => {
    // ...
  });

  it('falla al crear la inspección 27 en el mismo lote', async () => {
    // Requiere crear 26 inspecciones primero; puede marcarse con `.skip` o ejecutarse solo en CI
  });
});
```

### Configuración de Playwright

Crear `frontend/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,   // Secuencial para no pelearse por datos
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
```

### Tests E2E a implementar

#### `frontend/tests/e2e/auth.spec.ts`

```typescript
test('flujo completo de login y logout', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');

  await page.fill('input[type="email"]', 'control@fhesa.mx');
  await page.fill('input[type="password"]', 'fhesa123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Carlos Méndez')).toBeVisible();

  await page.click('[data-testid="user-menu"]');
  await page.click('text=Cerrar sesión');
  await expect(page).toHaveURL('/login');
});

test('login con credenciales inválidas muestra error', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'x@y.com');
  await page.fill('input[type="password"]', 'wrong');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=/credenciales/i')).toBeVisible();
});
```

#### `frontend/tests/e2e/equipos.spec.ts`

```typescript
test('crea un equipo nuevo con parámetros', async ({ page }) => {
  await loginAs(page, 'control@fhesa.mx');
  await page.goto('/equipos');
  await page.click('text=Nuevo equipo');

  await page.fill('input[name="clave"]', 'ALV-003');
  await page.fill('input[name="descripcionCorta"]', 'Alveógrafo Chopin TEST');
  await page.fill('input[name="marca"]', 'Chopin Technologies');

  // Agregar parámetro
  await page.click('text=Agregar parámetro');
  await page.fill('dialog input[name="clave"]', 'W');
  await page.fill('dialog input[name="nombre"]', 'Fuerza panadera');
  await page.fill('dialog input[name="unidadMedida"]', 'x10⁻⁴ J');
  await page.fill('dialog input[name="limiteInferior"]', '150');
  await page.fill('dialog input[name="limiteSuperior"]', '400');
  await page.click('dialog button[type="submit"]');

  await page.click('button:has-text("Guardar")');

  await expect(page).toHaveURL('/equipos');
  await expect(page.locator('text=ALV-003')).toBeVisible();
});
```

#### `frontend/tests/e2e/certificados.spec.ts`

```typescript
test('emite un certificado end-to-end y verifica en MailHog', async ({ page, request }) => {
  await loginAs(page, 'control@fhesa.mx');
  await page.goto('/certificados');
  await page.click('text=Emitir certificado');

  // Paso 1: Cliente
  await page.fill('input[name="buscarCliente"]', 'Bimbo');
  await page.click('text=Grupo Bimbo');
  await page.click('text=Siguiente');

  // Paso 2: Lote
  await page.fill('input[name="numeroLote"]', 'L-2026-001');
  await page.click('text=Buscar');
  await page.click('input[type="checkbox"]');
  await page.click('text=Siguiente');

  // Paso 3: Embarque
  await page.fill('input[name="numOrdenCompra"]', 'PO-E2E-001');
  await page.fill('input[name="cantidadSolicitada"]', '1000');
  await page.fill('input[name="cantidadEntrega"]', '1000');
  await page.fill('input[name="numFactura"]', 'F-E2E-001');
  // fechas se auto-completan o llenar explícitamente
  await page.click('text=Siguiente');

  // Paso 4: Revisión
  await page.click('text=Emitir certificado');

  await expect(page.locator('text=/CERT-2026-\\d{6}/')).toBeVisible();

  // Verificar correos en MailHog
  const res = await request.get('http://localhost:8025/api/v2/messages');
  const data = await res.json();
  const asuntos = data.items.map((m: any) => m.Content.Headers.Subject[0]);
  expect(asuntos.some((s: string) => s.includes('Certificado'))).toBe(true);
});
```

### Guías de prueba (markdown en `docs/guias-de-prueba/`)

Crear cuatro archivos markdown. El profesor los evaluará como parte de la entrega, así que deben estar bien estructurados.

#### `guia-pruebas-unitarias.md`

Estructura:

1. **Objetivo**: describir el alcance de las pruebas unitarias y su propósito.
2. **Herramientas**: Jest + ts-jest + mocks nativos.
3. **Criterios**: FQ-05 (cobertura dominio ≥ 70%) y FQ-06 (global ≥ 40%).
4. **Casos cubiertos**: tabla enumerando cada test unitario con su caso de uso asociado.
5. **Cómo ejecutar**: `docker compose exec backend npm run test:unit`.
6. **Cómo interpretar resultados**: qué significa un fallo, cómo ver la cobertura.
7. **Matriz caso de uso → test unitario**.

#### `guia-pruebas-integracion.md`

Estructura similar:
1. Objetivo: verificar endpoints con BD real.
2. Herramientas: Jest + Supertest + esquema `testing` en PostgreSQL.
3. Casos cubiertos.
4. Cómo ejecutar: `docker compose exec backend npm run test:integration`.
5. Matriz caso de uso → test de integración.

#### `guia-pruebas-e2e.md`

1. Objetivo: verificar flujos completos desde el navegador.
2. Herramienta: Playwright.
3. Flujos cubiertos: Login+Logout, Crear Equipo, Emitir Certificado.
4. Cómo ejecutar: `docker compose exec frontend npm run test:e2e`.
5. Cómo ver reportes: `npm run test:e2e:report`.

#### `guia-uat.md` (pruebas de aceptación del usuario)

Este es el documento más importante para el profesor. Estructura:

1. **Objetivo**: validar con el usuario final que el sistema cumple los requerimientos.
2. **Ambiente**: URL de acceso, credenciales de prueba por rol.
3. **Procedimiento**: 14 scripts de prueba, uno por cada caso de uso.
   - Ejemplo de un script:

```
     UC-12: Emitir Certificado de Calidad

     Actor: Personal de Control de Calidad
     Precondiciones: El cliente tiene valores de referencia particulares.
                     El lote tiene al menos una inspección CERRADA.

     Pasos:
     1. Iniciar sesión con control@fhesa.mx / fhesa123.
     2. Navegar a Certificados → Emitir certificado.
     3. Paso 1: buscar y seleccionar "Grupo Bimbo". [Resultado esperado: ...]
     4. Paso 2: capturar lote "L-2026-001". Seleccionar inspección A. [Resultado esperado: ...]
     5. Paso 3: capturar datos de embarque. [Resultado esperado: ...]
     6. Paso 4: revisar datos. Emitir. [Resultado esperado: número CERT-2026-NNNNNN, PDF generado]
     7. Abrir MailHog (localhost:8025). [Resultado esperado: dos correos, con PDF adjunto]

     Criterio de éxito: todos los pasos producen el resultado esperado.
```

4. **Matriz de trazabilidad**: casos de uso ↔ requerimientos ↔ scripts UAT.
5. **Registro de resultados**: tabla vacía para que el evaluador llene.

#### `matriz-casos-prueba.md`

Tabla maestra:

| UC | Nombre | Prueba Unitaria | Prueba Integración | Prueba E2E | Script UAT |
|---|---|---|---|---|---|
| UC-00 | Iniciar Sesión | ✓ AuthService | ✓ auth.test | ✓ auth.spec | ✓ guia-uat §1 |
| UC-01 | Alta Equipo | ✓ schemas | ✓ equipos.test | ✓ equipos.spec | ✓ guia-uat §2 |
| ... | ... | ... | ... | ... | ... |

### Script maestro `run-tests.sh`

En la raíz del repo:

```bash
#!/bin/bash
set -e

echo "==> Verificando que Docker Compose esté corriendo..."
docker compose ps | grep -q "backend" || (echo "ERROR: docker compose no está corriendo"; exit 1)

echo ""
echo "==> Backend: pruebas unitarias"
docker compose exec -T backend npm run test:unit

echo ""
echo "==> Backend: pruebas de integración"
docker compose exec -T backend npm run test:integration

echo ""
echo "==> Backend: cobertura"
docker compose exec -T backend npm run test:coverage

echo ""
echo "==> Frontend: E2E"
docker compose exec -T frontend npm run test:e2e

echo ""
echo "==> Todas las pruebas pasaron"
```

Darle permisos: `chmod +x run-tests.sh`.

## Procedimiento sugerido

### Bloque 1 — Configuración de Jest

1. Instala dependencias de Jest y Supertest.
2. Crea `backend/jest.config.js`.
3. Refactoriza `backend/src/index.ts` extrayendo la creación de `app` a `backend/src/app.ts` exportable (sin `listen`), para que los tests lo importen.
4. Crea `backend/tests/setup.ts` y `backend/tests/teardown.ts`.

### Bloque 2 — Pruebas unitarias del dominio

1. Escribe `tests/unit/domain/errors.test.ts`.
2. Escribe `tests/unit/lib/format.test.ts`.
3. Ejecuta `npm run test:unit` y verifica que pasan.

### Bloque 3 — Pruebas unitarias de servicios

1. Escribe `tests/unit/modules/auth/auth.service.test.ts` con mocks de Prisma.
2. Escribe `tests/unit/modules/certificados/certificados.numbering.test.ts`.
3. Escribe pruebas de schemas para auth, equipos y clientes.
4. Verifica que la cobertura de `src/domain/` y `src/modules/*.service.ts` supere el 70%.

### Bloque 4 — Preparar BD de pruebas

1. Crea `backend/.env.test` con `DATABASE_URL=...?schema=testing`.
2. Crea `backend/tests/helpers/db.ts` con funciones `resetTestDb()` y `seedForTests()`.
3. Crea `backend/tests/helpers/factories.ts` con builders para crear entidades en tests.
4. Crea `backend/tests/helpers/auth.ts` con helper `loginAs(correo): Promise<string>` que retorna token.

### Bloque 5 — Pruebas de integración

1. Escribe `tests/integration/auth.test.ts`.
2. Escribe `tests/integration/equipos.test.ts`.
3. Escribe `tests/integration/clientes.test.ts`.
4. Escribe `tests/integration/inspecciones.test.ts` (la más importante: valida secuencia A-Z y ficticias).
5. Escribe `tests/integration/certificados.test.ts` (incluye verificar que se genera el PDF).

### Bloque 6 — Configurar Playwright

1. Instala `@playwright/test` y `chromium`.
2. Crea `frontend/playwright.config.ts`.
3. Crea `frontend/tests/e2e/helpers/auth.ts` con helper `loginAs(page, correo)`.

### Bloque 7 — Tests E2E

1. Escribe `tests/e2e/auth.spec.ts`.
2. Escribe `tests/e2e/equipos.spec.ts`.
3. Escribe `tests/e2e/certificados.spec.ts`.

### Bloque 8 — Guías y matriz

1. Crea la carpeta `docs/guias-de-prueba/`.
2. Escribe las cuatro guías markdown.
3. Escribe `matriz-casos-prueba.md`.

### Bloque 9 — Script maestro y cierre

1. Crea `run-tests.sh` y dale permisos.
2. Ejecuta la suite completa: `./run-tests.sh`.
3. Genera reporte de cobertura y verifica umbrales.
4. Reporta al humano:
   - Resultados de cada suite.
   - Cobertura alcanzada (global y dominio).
   - Tests fallidos o flaky.
5. Sugiere commit: `test: add unit, integration, e2e tests and testing guides (Phase H)`.

## Criterios de éxito de la Fase H

- [ ] `npm run test:unit` pasa al 100%.
- [ ] `npm run test:integration` pasa al 100%.
- [ ] `npm run test:coverage` reporta cobertura dominio ≥ 70% y global ≥ 40%.
- [ ] `npm run test:e2e` pasa los tres flujos.
- [ ] Las cuatro guías en `docs/guias-de-prueba/` están completas y revisables.
- [ ] La matriz de casos de prueba cubre los 14 casos de uso.
- [ ] `./run-tests.sh` ejecuta todo secuencialmente sin intervención.

## Si algo falla

- Si Jest no reconoce las importaciones con `.js` (ESM), revisa `moduleNameMapper` en `jest.config.js`.
- Si los tests de integración fallan por estado compartido, asegúrate de que `resetTestDb()` se llama en `beforeEach` o `beforeAll` según la necesidad.
- Si Playwright no encuentra Chromium, corre `npx playwright install --with-deps chromium` en el contenedor.
- Si MailHog no retorna mensajes esperados, verifica que el backend está conectado a MailHog (revisa logs).

## Entregables

```
backend/
├── jest.config.js                                  (nuevo)
├── .env.test                                       (nuevo)
├── package.json                                    (scripts de test)
├── src/
│   └── app.ts                                      (extraído de index.ts)
└── tests/
    ├── setup.ts
    ├── teardown.ts
    ├── helpers/
    │   ├── db.ts
    │   ├── factories.ts
    │   └── auth.ts
    ├── unit/
    │   ├── domain/errors.test.ts
    │   ├── lib/format.test.ts
    │   └── modules/
    │       ├── auth/auth.service.test.ts
    │       ├── auth/auth.schemas.test.ts
    │       ├── certificados/certificados.numbering.test.ts
    │       └── equipos/equipos.schemas.test.ts
    └── integration/
        ├── auth.test.ts
        ├── equipos.test.ts
        ├── clientes.test.ts
        ├── inspecciones.test.ts
        └── certificados.test.ts

frontend/
├── playwright.config.ts                            (nuevo)
├── package.json                                    (scripts de test)
└── tests/
    └── e2e/
        ├── helpers/auth.ts
        ├── auth.spec.ts
        ├── equipos.spec.ts
        └── certificados.spec.ts

docs/guias-de-prueba/
├── guia-pruebas-unitarias.md
├── guia-pruebas-integracion.md
├── guia-pruebas-e2e.md
├── guia-uat.md
└── matriz-casos-prueba.md

run-tests.sh                                        (raíz)
```