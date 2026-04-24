<div align="center">

<img src="docs/assets/logo.webp" alt="Harinas Elizondo" width="200" />

# Sistema de Emisión de Certificados de Calidad

**Fábrica de Harinas Elizondo, S.A. de C.V.**

*Plataforma web para la gestión de análisis de laboratorio, control de lotes y emisión de certificados de calidad a clientes.*

---

[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-5FA04E?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📋 Tabla de contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Stack tecnológico](#-stack-tecnológico)
- [Estructura del repositorio](#-estructura-del-repositorio)
- [Puesta en marcha](#-puesta-en-marcha)
- [Roles del sistema](#-roles-del-sistema)
- [Reglas de negocio](#-reglas-de-negocio-clave)
- [Pruebas](#-pruebas)
- [Documentación](#-documentación)
- [Equipo](#-equipo-5)

---

## 🌾 Descripción

FHESA es una aplicación web diseñada para **Fábrica de Harinas Elizondo** que digitaliza el flujo completo de calidad: desde el registro de lotes de producción, el ingreso de resultados de inspección de laboratorio, hasta la emisión de certificados de calidad oficiales en PDF enviados al cliente final.

> **Contexto académico:** Proyecto desarrollado para la asignatura *Desarrollo de Software* en la Universidad Anáhuac México Norte (Ingeniería en Sistemas y TI), bajo la dirección del Prof. Nicolás Haidar Salazar. Entrega final: **1 de mayo de 2026**.

---

## ✨ Características

| Característica | Descripción |
|---|---|
| 🧪 **Gestión de lotes e inspecciones** | Secuencia A-Z por lote, hasta 26 inspecciones con trazabilidad completa |
| 📑 **Certificados inmutables** | Numeración `CERT-AAAA-NNNNNN` con reinicio anual y generación PDF |
| 👥 **Clientes y rangos particulares** | Rangos de especificación contenidos dentro de estándares internacionales |
| 🔬 **Inspecciones ficticias** | Ajustes justificados preservando el registro original intacto |
| 📧 **Envío automático por correo** | Integración con SMTP (MailHog en desarrollo) |
| 📊 **Reportes operativos y ejecutivos** | Indicadores para distintos niveles jerárquicos |
| 🔐 **Control de acceso por roles** | 5 roles diferenciados con permisos granulares |
| 🐳 **Contenerizado** | Un solo comando para levantar todo el stack |

---

## 🏛 Arquitectura

Arquitectura **en capas** siguiendo el modelo de vistas **4+1 de Kruchten**, con validación de entrada vía **Zod**, inyección de dependencias por constructor y separación estricta entre controladores, servicios y persistencia.

```
┌─────────────────────────────────────────────────────────────┐
│  React + Vite  ──►  Express API  ──►  Prisma  ──►  Postgres │
│                         │                                    │
│                         └──►  PDFKit  +  Nodemailer (SMTP)   │
└─────────────────────────────────────────────────────────────┘
```

Los diagramas UML completos (casos de uso, vista lógica, modelo ER, secuencia, despliegue) viven en [`diagrams/`](diagrams/) en formato PlantUML.

---

## 🧰 Stack tecnológico

<table>
<tr>
<td valign="top">

**Backend**
- Node.js 22 LTS
- Express
- TypeScript estricto
- Prisma ORM
- Zod (validación)
- PDFKit (certificados)
- Nodemailer (correo)
- Jest + Supertest

</td>
<td valign="top">

**Frontend**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- Zustand (stores)
- Playwright (E2E)

</td>
<td valign="top">

**Infraestructura**
- PostgreSQL 16
- Docker Compose
- MailHog (correo dev)
- PlantUML (diagramas)

</td>
</tr>
</table>

---

## 📁 Estructura del repositorio

```
harinas-elizondo/
├── backend/                    Servicio Express + Prisma
│   ├── src/
│   │   ├── modules/            auth · clientes · equipos · productos
│   │   │                       lotes · inspecciones · certificados · reportes
│   │   ├── middlewares/
│   │   ├── lib/
│   │   └── config/
│   ├── prisma/                 Schema y migraciones
│   └── tests/                  unit · integration
├── frontend/                   Aplicación React + Vite
│   ├── src/
│   │   ├── pages/              10 pantallas del sistema
│   │   ├── components/         UI reutilizable + shadcn
│   │   ├── stores/             auth store (Zustand)
│   │   ├── hooks/
│   │   └── lib/                cliente HTTP
│   └── tests/e2e/              Playwright
├── diagrams/                   8 diagramas PlantUML + wireframes
├── docs/
│   ├── guias-de-prueba/        Guías UAT, unitarias, integración, E2E
│   ├── prompts/                Prompts por fase de construcción
│   └── assets/                 Imágenes del README
├── compose.yaml                Orquestación Docker (Compose Specification)
└── .env.example                Plantilla de variables de entorno
```

---

## 🚀 Puesta en marcha

### Prerrequisitos

- [Docker](https://www.docker.com/) + Docker Compose
- Git

### Arranque rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/Verttungas/harinas-elizondo.git
cd harinas-elizondo

# 2. Crear el archivo de entorno
cp .env.example .env
# Editar .env con los valores apropiados (DB_PASSWORD es obligatorio)

# 3. Levantar el stack completo
docker compose up
```

### Servicios disponibles

| Servicio | URL | Descripción |
|---|---|---|
| 🎨 **Frontend** | http://localhost:5173 | Aplicación React |
| ⚙️ **Backend API** | http://localhost:3000 | API REST |
| 🐘 **PostgreSQL** | `localhost:5432` | Base de datos |
| 📨 **MailHog UI** | http://localhost:8025 | Bandeja de correo de desarrollo |

### Comandos útiles

```bash
docker compose up -d                                         # En segundo plano
docker compose logs -f backend                               # Ver logs del backend
docker compose exec backend sh                               # Shell en el contenedor
docker compose exec backend npx prisma migrate dev           # Nueva migración
docker compose exec backend npx prisma studio --port 5555 --hostname 0.0.0.0  # Explorador de BD (exponer puerto 5555 en compose.yaml o ejecutar fuera de Docker)
docker compose down                                          # Detener
./run-tests.sh                                               # Suite completa de pruebas
```

---

## 👤 Roles del sistema

| Rol | Responsabilidades |
|---|---|
| 🔬 **`LABORATORIO`** | Registra inspecciones y resultados de análisis |
| ✅ **`CONTROL_CALIDAD`** | Gestiona equipos, clientes y emite certificados |
| 📋 **`ASEGURAMIENTO_CALIDAD`** | Consulta reportes y auditoría |
| 🏭 **`GERENTE_PLANTA`** | Consulta indicadores operativos |
| 📈 **`DIRECTOR_OPERACIONES`** | Consulta reportes ejecutivos |

---

## 📐 Reglas de negocio clave

- **Secuencia A-Z** — Las inspecciones de un lote se identifican con letras de la A a la Z (máx. 26 por lote).
- **Inspección ficticia** — Cuando un resultado queda fuera de especificación, se puede generar una inspección ajustada que consume una letra de la secuencia, con justificación obligatoria y preservando la original intacta.
- **Rangos contenidos** — Los valores de referencia de cliente deben estar dentro del rango internacional del parámetro.
- **Certificado inmutable** — Una vez emitido, no se edita. Las correcciones generan un nuevo certificado con nueva numeración.
- **Formato de número** — `CERT-AAAA-NNNNNN` con consecutivo que reinicia cada año.
- **Soft delete** — No se elimina físicamente ningún registro de negocio.

---

## 🧪 Pruebas

| Tipo | Herramienta | Ubicación |
|---|---|---|
| Unitarias | Jest | [`backend/tests/unit/`](backend/tests/unit/) |
| Integración | Jest + Supertest | [`backend/tests/integration/`](backend/tests/integration/) |
| End-to-end | Playwright | [`frontend/tests/e2e/`](frontend/tests/e2e/) |
| UAT | Manual (guía) | [`docs/guias-de-prueba/guia-uat.md`](docs/guias-de-prueba/guia-uat.md) |

Ejecución de la suite completa:

```bash
./run-tests.sh
```

Las guías detalladas de cada nivel de prueba viven en [`docs/guias-de-prueba/`](docs/guias-de-prueba/).

---

## 📚 Documentación

- [`CLAUDE.md`](CLAUDE.md) — Contexto, convenciones y reglas absolutas del proyecto
- [`diagrams/`](diagrams/) — Diagramas UML (casos de uso, ER, vistas 4+1)
- [`docs/guias-de-prueba/`](docs/guias-de-prueba/) — Guías de pruebas y matriz de casos

---

## 👥 Equipo 5

> Ingeniería en Sistemas y TI · Universidad Anáhuac México Norte · Facultad de Ingeniería

| Ícono | Nombre |
|---|---|
| 👨‍💻 | **Carlos Alberto Ortiz Pérez Vertti** |
| 👨‍💻 | **Fernando Alexander Martínez Villavicencio** |
| 👨‍💻 | **Mario Arturo Olmos López** |
| 👨‍💻 | **Mauricio Sánchez de la Torre** |
| 👨‍💻 | **Juan Pablo Pinto Ruíz** |

**Profesor:** Nicolás Haidar Salazar
**Asignatura:** Desarrollo de Software

---

<div align="center">

<sub>© 2026 Equipo 5 · Fábrica de Harinas Elizondo, S.A. de C.V.</sub>

</div>
