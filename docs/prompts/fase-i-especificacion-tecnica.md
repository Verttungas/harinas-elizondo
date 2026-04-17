# Fase I — Documento de Especificación Técnica

## Prerrequisitos

- Todas las fases anteriores (A–H) completadas.
- Suite de pruebas pasando con cobertura ≥ 40% global y ≥ 70% en dominio.
- PDFs de certificados generándose correctamente.
- Las dos entregas anteriores (Arquitectura y Diseño Técnico) disponibles en el Google Drive del Equipo 5.

## Objetivo

Generar el documento final de **Especificación Técnica** solicitado por el documento de instrucciones de la asignatura. Este documento consolida lo construido en la Entrega 3 y hace el cierre formal del proyecto académico. Se entrega como archivo Word (`.docx`) descargable.

A diferencia de las Entregas 1 y 2 (que eran documentos de diseño), este documento describe **lo que efectivamente se construyó**, con evidencia del código real, comandos ejecutables, y referencias a los artefactos del repositorio. No se redacta en abstracto.

Además, esta fase cierra el repositorio con el `README.md` final que el humano (el usuario que ha liderado las fases) preparará.

## Contexto previo

Lee primero `CLAUDE.md` en la raíz. Este prompt está diseñado para ejecutarse en **Claude Cowork** (no en Claude Code), porque el objetivo principal es generar un archivo Word consolidado, y la skill `docx` está disponible ahí.

**El usuario pegará este prompt directamente en Cowork, no en Claude Code.** El repositorio debe estar descargado en la máquina del usuario como carpeta local para que Cowork pueda leer los archivos fuente.

## Alcance de esta fase (qué SÍ se hace)

- Documento Word `EspecificacionTecnica-FHESA.docx` con la siguiente estructura:
  1. Portada (sin numeración).
  2. Introducción y alcance del documento.
  3. Resumen ejecutivo del sistema construido.
  4. Stack tecnológico con versiones reales.
  5. Arquitectura implementada (referencia a Entrega 1; no duplicar).
  6. Modelo de datos físico (referencia a Entrega 2; incluir evidencia de migraciones aplicadas).
  7. Módulos del backend (uno por módulo con sus endpoints y notas de implementación).
  8. Frontend: organización, componentes compartidos, pantallas.
  9. Seguridad: autenticación, autorización, soft delete, bitácora.
  10. Pruebas: resumen de cobertura, tipos de pruebas, referencia a las guías.
  11. Guía de despliegue y ejecución.
  12. Guía de pruebas de aceptación (reutilizar la guía UAT de la Fase H).
  13. Limitaciones conocidas y alcance no cubierto.
  14. Referencias bibliográficas.
- Se producirá **solo el `.docx`**; las guías de prueba en `docs/guias-de-prueba/` quedan en markdown como complemento.

## Alcance que NO se hace en esta fase

- No se duplica el contenido de las Entregas 1 y 2.
- No se reescriben los casos de uso; se referencian.
- No se incluyen capturas de pantalla del sistema funcionando (podrían agregarse manualmente si el usuario lo considera necesario).
- No se genera el `README.md` del repo; esa tarea queda a cargo del humano.

## Requisitos de formato

- Tamaño: US Letter, márgenes de 1 pulgada.
- Fuente base: Arial 11 pt.
- Encabezados: Arial negrita (H1 = 16 pt, H2 = 14 pt, H3 = 12 pt).
- Tablas con bordes sutiles gris claro (#CCCCCC), encabezado sombreado suave (#D5E8F0).
- Numeración de páginas al pie, centrada, iniciando después de la portada.
- Todo en español, tono técnico y profesional.
- No incluir TOC automática ni sección de control de versiones (por consistencia con la Entrega 2).

## Estructura y contenido del documento

### PORTADA (sin número de página)

Centrado verticalmente:

```
UNIVERSIDAD ANÁHUAC
FACULTAD DE INGENIERÍA
INGENIERÍA EN SISTEMAS Y TECNOLOGÍAS DE INFORMACIÓN
CAMPUS MÉXICO NORTE

[espacio]

DESARROLLO DE SOFTWARE
Tema: Diseño Arquitectónico y Construcción

[espacio]

DOCUMENTO DE ESPECIFICACIÓN TÉCNICA
Sistema de Emisión de Certificados de Calidad
Fábrica de Harinas Elizondo, S.A. de C.V. (FHESA)

Entrega 3 — Construcción

[espacio]

Profesor: Nicolás Haidar Salazar

Equipo 5
Carlos Alberto Ortiz Pérez Vertti
Fernando Alexander Martínez Villavicencio
Mario Arturo Olmos López
Mauricio Sánchez de la Torre
Juan Pablo Pinto Ruíz

[espacio]

Versión 1.0 — [fecha actual]
```

### 1. INTRODUCCIÓN

#### 1.1 Propósito

El presente documento describe la especificación técnica del sistema construido durante la Entrega 3 del proyecto. Complementa los documentos previos (Arquitectura y Diseño Técnico) con el detalle de implementación del software efectivamente desarrollado.

El sistema implementa el proceso de Emisión de Certificados de Calidad para Fábrica de Harinas Elizondo (FHESA), cubriendo los 14 casos de uso definidos, las 48 reglas de negocio, y los criterios de calidad (ficha técnica de 37 indicadores de la Entrega 1).

#### 1.2 Alcance de la entrega

La Entrega 3 incluye:

- Código fuente completo de backend (Node.js + TypeScript + Express + Prisma) y frontend (React + TypeScript + Vite).
- 43 endpoints REST implementados.
- 10 pantallas funcionales según los wireframes del diseño.
- Esquema de base de datos con 13 tablas, 7 enums, triggers y CHECK constraints.
- Suite de pruebas automatizadas: unitarias, de integración y E2E.
- Guías de prueba completas.
- Infraestructura Docker reproducible.

Se entrega como código en el repositorio GitHub `harinas-elizondo` y este documento.

#### 1.3 Referencias

Lista numerada:

1. Sommerville, I. (2011). *Ingeniería de Software* (9na ed.). Pearson.
2. Pressman, R. S. (2010). *Ingeniería del Software* (7ma ed.). McGraw-Hill.
3. Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures*. Tesis doctoral.
4. ISO/IEC 25010:2023. *Product Quality Model*.
5. Kruchten, P. (1995). *The "4+1" View Model*. IEEE Software.
6. Entrega 1 — Arquitectura del Software (Equipo 5, 2026).
7. Entrega 2 — Diseño Técnico (Equipo 5, 2026).
8. Haidar, N. H. (2017). *Requerimientos Funcionales FHESA*.
9. PostgreSQL 16 Documentation. [postgresql.org/docs/16](https://www.postgresql.org/docs/16/)
10. Prisma ORM Documentation. [prisma.io/docs](https://www.prisma.io/docs)
11. React Documentation. [react.dev](https://react.dev)
12. Express Documentation. [expressjs.com](https://expressjs.com)
13. RFC 9457: Problem Details for HTTP APIs. IETF.

### 2. RESUMEN EJECUTIVO DEL SISTEMA

Párrafo breve (4-6 oraciones) que describa qué hace el sistema construido, quién lo usa, y qué problema resuelve. Mencionar que:
- Es una aplicación web moderna (SPA + API REST).
- Orquestada con Docker Compose para despliegue reproducible.
- Cumple el alcance de la v1 definida en los requerimientos (excluye integración con SAP ByD y conexión directa con equipos de laboratorio).

### 3. STACK TECNOLÓGICO IMPLEMENTADO

Tabla de 3 columnas: Componente | Tecnología | Versión.

Ejemplo:

| Componente | Tecnología | Versión |
|---|---|---|
| Lenguaje (backend y frontend) | TypeScript | 5.x |
| Runtime | Node.js | 22 LTS (contenedor) |
| Framework backend | Express | 4.x |
| ORM | Prisma | 5.x |
| Base de datos | PostgreSQL | 16 |
| Framework frontend | React | 18 |
| Bundler frontend | Vite | 5.x |
| Estilos | Tailwind CSS | 3.x |
| Componentes UI | shadcn/ui | basados en Radix |
| Gestión de estado | Zustand | 4.x |
| Cliente HTTP | Axios | 1.x |
| Formularios | react-hook-form + Zod | 7.x / 3.x |
| Pruebas backend | Jest + Supertest | — |
| Pruebas E2E | Playwright | — |
| Correo en desarrollo | MailHog | — |
| PDF | PDFKit | — |
| Autenticación | JWT (jsonwebtoken) + bcrypt | — |
| Orquestación | Docker Compose v2 (`compose.yaml`) | — |
| Diagramación | PlantUML | — |

**Instrucción para Cowork**: las versiones exactas deben leerse de `backend/package.json` y `frontend/package.json`. No inventar versiones.

### 4. ARQUITECTURA IMPLEMENTADA

Referenciar la Entrega 1 y resumir qué se implementó efectivamente:

- **Vista lógica**: 5 capas (Presentación, Aplicación, Dominio, Infraestructura, Datos) materializadas como carpetas y módulos del código. Mencionar: `src/routes/`, `src/modules/*/controller.ts`, `src/modules/*/service.ts`, `src/domain/`, `src/lib/prisma.ts`, PostgreSQL.
- **Vista de desarrollo**: estructura del repo con `backend/`, `frontend/`, `diagrams/`, `docs/`.
- **Vista física**: 4 contenedores Docker (frontend, backend, database, mailhog) + volúmenes (pgdata, certificados-pdf).

Para evidencia, incluir un bloque de código con el output real de `docker compose ps`.

### 5. MODELO DE DATOS

#### 5.1 Esquema físico

Referenciar la Entrega 2 (modelo ER). Confirmar que se implementó con:
- 13 tablas con nombres en snake_case español.
- 7 tipos ENUM.
- Claves primarias BIGSERIAL.
- Índices secundarios según diseño.

#### 5.2 Migraciones aplicadas

Tabla con las migraciones generadas por Prisma:

| # | Nombre | Descripción |
|---|---|---|
| 1 | `initial_schema` | Creación de las 13 tablas y 7 enums |
| 2 | `business_constraints_and_triggers` | CHECK constraints y 3 triggers de dominio (secuencia A-Z, validación de rangos cliente, cálculo de desviación) |

Para evidencia, incluir el output de `docker compose exec backend npx prisma migrate status`.

#### 5.3 Datos semilla

Describir brevemente el script de seed y los datos que carga: 5 usuarios (uno por rol), 3 productos, 2 equipos con 9 parámetros, 3 clientes con valores particulares, 3 lotes con inspecciones incluida una ficticia demostrativa.

### 6. MÓDULOS DEL BACKEND

Para cada módulo (auth, equipos, clientes, productos, lotes, inspecciones, certificados, reportes), incluir una subsección H3 con:

1. **Propósito**: 1-2 oraciones.
2. **Endpoints**: tabla resumen (Método, Ruta, Descripción, Roles).
3. **Reglas de negocio relevantes**: lista de RN implementadas.
4. **Notas de implementación**: 1 párrafo con lo más destacable (ej. triggers usados, transacciones, integraciones).

Ejemplo para inspecciones:

> **Notas de implementación**: la secuencia A-Z se asigna mediante un trigger de PostgreSQL (`trg_asignar_secuencia_inspeccion`), garantizando atomicidad incluso bajo concurrencia. Las inspecciones ficticias (UC-11) se crean con `esFicticia: true` y `inspeccionOrigenId` apuntando a la inspección original, que se preserva intacta por RN-30. Los resultados se calculan automáticamente mediante el trigger `trg_calcular_resultado_inspeccion`, que deriva desviación y estado dentro/fuera de especificación.

### 7. FRONTEND

#### 7.1 Organización

Descripción de la estructura de `frontend/src/`: pages, components (layout, shared, ui), routes, stores, hooks, lib, types.

#### 7.2 Sistema de diseño

Resumen de las decisiones de UI tomadas:
- Fuente Inter con ajustes tipográficos.
- Paleta semántica (verde, naranja, rojo, azul).
- shadcn/ui con 16 componentes base.
- Patrones de listados, formularios y wizards consistentes.

#### 7.3 Pantallas implementadas

Tabla que mapea wireframes (de la Entrega 2) a implementación:

| Wireframe | Pantalla | Archivo React | Casos de Uso |
|---|---|---|---|
| W-01 | Login | `pages/Login.tsx` | UC-00 |
| W-02 | Dashboard | `pages/Dashboard.tsx` | — |
| W-03 | Listado Equipos | `pages/equipos/EquiposListado.tsx` | UC-04 |
| ... | ... | ... | ... |

#### 7.4 Autenticación y autorización

Describir:
- JWT persistido en `localStorage` vía Zustand con middleware `persist`.
- Interceptor de Axios que inyecta el token en cada request.
- `ProtectedRoute` y `RoleRoute` como guardas del router.
- UI adaptativa que oculta acciones según rol.

### 8. SEGURIDAD

Subsecciones:

#### 8.1 Autenticación

- bcrypt con cost ≥ 10 para hashear contraseñas (FQ-11).
- JWT con secret ≥ 32 caracteres (FQ-14), expiración 8 horas.
- Bloqueo temporal tras 5 intentos fallidos (RN).

#### 8.2 Autorización

- Middleware `requireAuth` aplicado globalmente a rutas privadas.
- Middleware `requireRole(...)` aplicado selectivamente según el diseño de API.

#### 8.3 Integridad y auditoría

- Validación con Zod en todo endpoint de escritura (FQ-12).
- Soft delete generalizado: ningún DELETE físico en tablas de negocio (RN-09, RN-18).
- Bitácora (`bitacora`) con registro de usuario y timestamp en operaciones críticas (FQ-13).

#### 8.4 Resistencia a ataques comunes

- Prisma ORM con queries parametrizadas: inmune a SQL injection (FQ-15).
- React escapa automáticamente strings: mitigación natural de XSS.
- Helmet aplicado como middleware para headers de seguridad.
- CORS configurado explícitamente, no `*`.

### 9. PRUEBAS

#### 9.1 Tipos de pruebas implementadas

Tabla:

| Tipo | Herramienta | Ubicación | Archivos |
|---|---|---|---|
| Unitarias | Jest | `backend/tests/unit/` | ~N archivos |
| Integración | Jest + Supertest | `backend/tests/integration/` | ~N archivos |
| End-to-End | Playwright | `frontend/tests/e2e/` | ~N archivos |

**Instrucción para Cowork**: contar los archivos reales en cada carpeta y poblar la tabla.

#### 9.2 Cobertura alcanzada

Reportar la cobertura real del proyecto:
- Global (objetivo FQ-06 ≥ 40%): leer del reporte de Jest.
- Dominio (objetivo FQ-05 ≥ 70%): leer del reporte.

**Instrucción para Cowork**: leer `backend/coverage/coverage-summary.json` si existe. Si no está disponible, indicar "pendiente de reporte final".

#### 9.3 Matriz de trazabilidad

Incluir resumen de `docs/guias-de-prueba/matriz-casos-prueba.md`.

### 10. DESPLIEGUE Y EJECUCIÓN

#### 10.1 Prerrequisitos

- Docker Desktop 25+ (o Docker Engine + Compose v2 en Linux).
- Git.
- Navegador moderno (Chrome, Firefox, Edge, Safari actualizados).

#### 10.2 Primer arranque

```bash
git clone https://github.com/<usuario>/harinas-elizondo.git
cd harinas-elizondo
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Editar .env para definir JWT_SECRET (cadena larga y aleatoria)
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

#### 10.3 URLs de acceso

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API Backend | http://localhost:3000/api/v1 |
| MailHog (correos de desarrollo) | http://localhost:8025 |
| Prisma Studio | `docker compose exec backend npx prisma studio` → http://localhost:5555 |

#### 10.4 Credenciales de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| LABORATORIO | lab@fhesa.mx | fhesa123 |
| CONTROL_CALIDAD | control@fhesa.mx | fhesa123 |
| ASEGURAMIENTO_CALIDAD | calidad@fhesa.mx | fhesa123 |
| GERENTE_PLANTA | gerente@fhesa.mx | fhesa123 |
| DIRECTOR_OPERACIONES | director@fhesa.mx | fhesa123 |

#### 10.5 Ejecutar pruebas

```bash
./run-tests.sh
```

O individualmente:

```bash
docker compose exec backend npm run test:unit
docker compose exec backend npm run test:integration
docker compose exec backend npm run test:coverage
docker compose exec frontend npm run test:e2e
```

#### 10.6 Detención y limpieza

```bash
# Detener sin borrar datos
docker compose down

# Detener y borrar volúmenes (elimina datos)
docker compose down -v
```

### 11. GUÍA DE PRUEBAS DE ACEPTACIÓN

Reutilizar el contenido de `docs/guias-de-prueba/guia-uat.md` completo. Los 14 scripts de prueba (uno por caso de uso) se transcriben a este documento como sección extensa.

**Instrucción para Cowork**: leer el archivo markdown, transformar a formato Word manteniendo la estructura, y pegarlo como contenido de esta sección.

### 12. LIMITACIONES CONOCIDAS Y ALCANCE NO CUBIERTO

Lista honesta de lo que no se implementó o quedó con limitaciones:

- **Integración con SAP Business ByDesign**: documentada en los requerimientos pero fuera del alcance de v1.
- **Conexión directa con equipos de laboratorio**: fuera del alcance de v1; los valores se capturan manualmente.
- **Reintentos automáticos programados de correo**: en la implementación actual, los reintentos son manuales (botón "Reenviar" en el detalle del certificado). Una cola de trabajos con cron se propone para v2.
- **Firma digital del PDF**: el documento generado no incluye firma electrónica. Se recomienda añadirla en v2 para cumplimiento normativo si aplica.
- **Refresh tokens**: la autenticación usa JWT con expiración fija de 8 horas sin mecanismo de refresh. El usuario debe reingresar credenciales al expirar.
- **Internacionalización**: el sistema está únicamente en español.
- **Accesibilidad**: cumple nivel básico gracias a shadcn/ui (Radix UI), pero no fue auditado formalmente contra WCAG 2.1 AA.
- **Optimización de consultas**: no se implementaron vistas materializadas para reportes (planeadas en la Entrega 2 como mejora futura).

### 13. REFERENCIAS BIBLIOGRÁFICAS

Repetir la lista de la sección 1.3.

## Instrucciones finales para Cowork

1. Lee primero `/mnt/skills/public/docx/SKILL.md` íntegramente.
2. Navega al repositorio local descargado (pregunta al usuario la ruta si es necesario).
3. Para secciones que requieren leer archivos reales:
   - `backend/package.json` → versiones del stack.
   - `backend/prisma/migrations/` → listado de migraciones aplicadas.
   - `backend/coverage/coverage-summary.json` → cobertura real (si existe).
   - Carpeta `backend/tests/` → contar archivos de prueba.
   - Carpeta `frontend/tests/e2e/` → contar archivos E2E.
   - `docs/guias-de-prueba/guia-uat.md` → transcribir a sección 11.
4. Construye el documento sección por sección. Valida después con `python scripts/office/validate.py EspecificacionTecnica-FHESA.docx`.
5. Si la validación falla, desempaca el docx, arregla el XML y vuelve a empacar.
6. Entrega el archivo `EspecificacionTecnica-FHESA.docx` en el directorio raíz de trabajo.

## Cuando termines

El documento queda disponible para:
- Subir a Google Drive (carpeta "Entrega 3 — Construcción").
- Enviar al profesor Haidar junto con el link al repo GitHub.
- Guardar como evidencia académica del equipo.