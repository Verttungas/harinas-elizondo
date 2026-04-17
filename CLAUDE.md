# Proyecto: Sistema de Emisión de Certificados de Calidad — FHESA

> Este archivo es leído automáticamente por Claude Code al iniciar cada sesión. Contiene el contexto, stack, convenciones y reglas absolutas del proyecto. Todos los integrantes del equipo lo comparten.

## Overview

Aplicación web para **Fábrica de Harinas Elizondo, S.A. de C.V.** que gestiona la emisión de certificados de calidad a clientes a partir de análisis de laboratorio sobre lotes de producción.

**Contexto:** Proyecto académico para la asignatura *Desarrollo de Software* (Universidad Anáhuac, Facultad de Ingeniería, Ingeniería en Sistemas y TI, Campus México Norte). Profesor: Nicolás Haidar Salazar. Entrega final: 1 de mayo de 2026.

**Equipo 5:**
- Carlos Alberto Ortiz Pérez Vertti
- Fernando Alexander Martínez Villavicencio
- Mario Arturo Olmos López
- Mauricio Sánchez de la Torre
- Juan Pablo Pinto Ruíz

**No es código de producción.** Priorizar claridad, buenas prácticas demostrables y cumplimiento del contrato académico sobre optimización extrema.

## Tech stack

- **Backend:** Node.js 22 LTS + Express + TypeScript + Prisma ORM
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL 16
- **Contenedores:** Docker Compose (archivo `compose.yaml`, no `docker-compose.yml`)
- **Correo en desarrollo:** MailHog
- **Pruebas:** Jest + Supertest (backend), Playwright (E2E)
- **Diagramas:** PlantUML

## Estructura del repositorio

```
harinas-elizondo/
├── CLAUDE.md                    Este archivo (contexto para Claude Code)
├── CLAUDE.local.md              Notas personales del integrante (gitignored, opcional)
├── compose.yaml                 Orquestación Docker
├── .env.example                 Plantilla de variables de entorno
├── .gitignore
├── diagrams/                    Archivos .puml de arquitectura y wireframes
├── docs/
│   └── prompts/                 Prompts por fase de construcción (E a I)
├── backend/                     Servicio Express + Prisma
└── frontend/                    Aplicación React + Vite
```

## Convenciones de código

- **Idioma:** nombres de tablas/columnas/entidades en **español** (`clientes`, `equipos_laboratorio`, `numero_lote`). Código TypeScript y mensajes de error al usuario en **español**. Mensajes de log internos en **inglés**. Commits en **inglés**.
- **Formato de archivos:** UTF-8, LF (no CRLF), sin BOM.
- **TypeScript estricto:** `tsconfig.json` con `strict: true` en ambos módulos. No usar `any` salvo en casos imprescindibles justificados con un comentario.
- **Async/await:** preferir sobre `.then().catch()`.
- **Errores:** usar clases de error de dominio, nunca `throw "string"`.
- **Validación de entrada:** todo endpoint de escritura valida con **Zod** antes de llegar al controlador.
- **Inyección de dependencias:** constructor injection, sin decoradores.

## Reglas absolutas (no las rompas)

1. **Nunca uses `docker-compose.yml`.** El archivo se llama `compose.yaml` (Compose Specification vigente).
2. **Nunca hagas eliminación física de registros** en tablas de negocio. Usa soft delete vía `estado` o `activo`.
3. **Las migraciones de Prisma nunca se editan después de aplicarse.** Si algo cambió, genera una nueva migración.
4. **Las claves primarias son `BIGSERIAL`.** Nunca UUIDs ni autoincrementales `SERIAL`.
5. **Los secretos nunca van al repo.** Siempre en `.env` (gitignored) con plantilla en `.env.example`.
6. **Todos los cambios en esquema Prisma requieren migración explícita** vía `npx prisma migrate dev --name <descripcion>`.
7. **Verifica siempre la documentación oficial antes de usar APIs específicas** de librerías (Prisma, Express, etc.). Prioridad: docs oficiales > Stack Overflow > tutoriales.
8. **Toda operación destructiva irreversible requiere confirmación del usuario humano** antes de ejecutarse (ej. `prisma migrate reset`, `docker compose down -v`).

## Reglas de negocio clave del dominio

- **Secuencia A-Z:** las inspecciones de un lote se identifican con letras mayúsculas A hasta Z. Máximo 26 inspecciones por lote.
- **Inspección ficticia:** cuando una inspección queda fuera de especificación, se puede generar una inspección "ficticia" ajustada. La original se preserva intacta. La ficticia consume una letra de la secuencia y requiere justificación.
- **Rangos de cliente contenidos:** los valores de referencia particulares de un cliente deben estar dentro del rango internacional del parámetro correspondiente.
- **Certificado inmutable:** una vez emitido, un certificado no se edita. Correcciones generan un nuevo certificado con nueva numeración.
- **Número de certificado:** formato `CERT-AAAA-NNNNNN` donde `AAAA` es el año y `NNNNNN` un consecutivo que reinicia cada año.

## Roles del sistema

Cinco roles, cada usuario tiene exactamente uno:

- `LABORATORIO` — registra inspecciones
- `CONTROL_CALIDAD` — gestiona equipos, clientes y emite certificados
- `ASEGURAMIENTO_CALIDAD` — consulta reportes
- `GERENTE_PLANTA` — consulta indicadores operativos
- `DIRECTOR_OPERACIONES` — consulta reportes ejecutivos

## Comandos frecuentes

Desde la raíz del repositorio:

```bash
# Arrancar todo
docker compose up

# Arrancar en segundo plano
docker compose up -d

# Ver logs de un servicio específico
docker compose logs -f backend

# Detener y limpiar
docker compose down

# Detener y borrar volúmenes (destructivo, requiere confirmación)
docker compose down -v

# Entrar al contenedor backend
docker compose exec backend sh

# Regenerar cliente de Prisma tras cambios al schema
docker compose exec backend npx prisma generate

# Crear una nueva migración
docker compose exec backend npx prisma migrate dev --name <descripcion>

# Ver la base de datos en navegador
docker compose exec backend npx prisma studio --port 5555 --browser none
```

## Documentos de referencia externa

Estos documentos existen fuera del repositorio (en Google Drive del Equipo 5) y contienen el detalle de diseño:

- **Entrega 1 — Arquitectura del Software:** vistas 4+1 (Kruchten), características de calidad ISO/IEC 25010:2023, ficha técnica con 37 criterios.
- **Entrega 2 — Diseño Técnico:** 14 casos de uso detallados (formato Cockburn), modelo ER físico, diccionario de datos, diseño de API REST (43 endpoints), 10 wireframes.

Cuando sea necesario, los detalles pueden consultarse en esos documentos.

## Estrategia de trabajo con Claude Code

El trabajo de construcción está dividido en fases (A–J). Las fases A, B, C y D ya están completadas. Las fases pendientes son E, F, G, H, I y J.

**Prompts disponibles** en `docs/prompts/`:
- `fase-e-flujos-complejos.md` — backend: inspecciones con secuencia A-Z, certificados, PDF, correo, reportes
- `fase-f-frontend-nucleo.md` — frontend: Vite, routing, auth, cliente HTTP, sistema de diseño
- `fase-g-pantallas.md` — frontend: 10 pantallas según los wireframes
- `fase-h-pruebas.md` — pruebas unitarias, de integración y E2E
- `fase-i-especificacion-tecnica.md` — documento final en Word

**Para ejecutar una fase:**

1. Abrir Claude Code en la raíz del repositorio.
2. Indicar: *"Lee `docs/prompts/fase-X-nombre.md` y ejecuta las instrucciones paso por paso."*
3. Claude Code leerá este `CLAUDE.md` automáticamente y seguirá las convenciones aquí definidas.
4. Durante la ejecución, Claude Code pedirá confirmación antes de acciones destructivas o que afecten múltiples archivos.
5. Al terminar, revisar, probar, y hacer commit a una rama feature.

**Dependencias entre fases:**
- F puede ejecutarse en paralelo a E.
- G depende de F completado, consume endpoints de D y E.
- H depende de E y G completados.
- I depende de todas las anteriores.

## Qué NO hacer

- No instales dependencias globalmente; todo va en `package.json`.
- No hagas commits que rompan el build. Si `docker compose up` no arranca, no es commit válido.
- No crees "atajos" fuera de la arquitectura en capas (rutas que consultan BD directamente, componentes que hablan con la BD, etc.).
- No reescribas archivos que ya funcionan a menos que tengas razón concreta.
- No introduzcas librerías nuevas sin justificarlo primero.
- No modifiques diagramas `.puml` ya aprobados a menos que se indique explícitamente.