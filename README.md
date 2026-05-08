<div align="center">

<img src="frontend/public/logo.webp" alt="Harinas Elizondo" width="200" />

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

## Tabla de contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Puesta en marcha](#puesta-en-marcha)
- [Roles del sistema](#roles-del-sistema)
- [Reglas de negocio](#reglas-de-negocio-clave)
- [Equipo](#equipo-2)

---

## Descripción

FHESA es una aplicación web diseñada para **Fábrica de Harinas Elizondo** que digitaliza el flujo completo de calidad: desde el registro de lotes de producción, el ingreso de resultados de inspección de laboratorio, hasta la emisión de certificados de calidad oficiales en PDF enviados al cliente final.

> **Contexto académico:** Proyecto desarrollado para la asignatura *Desarrollo de Software* en la Universidad Anáhuac México Norte (Ingeniería en Sistemas y TI), bajo la dirección del Prof. Nicolás Haidar Salazar. Entrega final: **10 de mayo de 2026**.

---

## Características

| Característica | Descripción |
|---|---|
| **Gestión de lotes e inspecciones** | Secuencia A-Z por lote, hasta 26 inspecciones con trazabilidad completa |
| **Certificados inmutables** | Numeración `CERT-AAAA-NNNNNN` con reinicio anual y generación PDF |
| **Clientes y rangos particulares** | Rangos de especificación contenidos dentro de estándares internacionales |
| **Inspecciones ficticias** | Ajustes justificados preservando el registro original intacto |
| **Envío automático por correo** | Integración con SMTP (Mailpit en desarrollo) |
| **Reportes operativos y ejecutivos** | Indicadores para distintos niveles jerárquicos |
| **Control de acceso por roles** | 6 roles diferenciados con permisos granulares |
| **Contenerizado** | Un solo comando para levantar todo el stack |

---

## Arquitectura

Arquitectura **en capas** siguiendo el modelo de vistas **4+1 de Kruchten**, con validación de entrada vía **Zod**, inyección de dependencias por constructor y separación estricta entre controladores, servicios y persistencia.

```
┌─────────────────────────────────────────────────────────────┐
│  React + Vite  ──►  Express API  ──►  Prisma  ──►  Postgres │
│                         │                                    │
│                         └──►  PDFKit  +  Nodemailer (SMTP)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack tecnológico

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

</td>
<td valign="top">

**Infraestructura**
- PostgreSQL 16
- Docker Compose
- Mailpit (correo dev)

</td>
</tr>
</table>

---

## Estructura del repositorio

```
harinas-elizondo/
├── backend/                    Servicio Express + Prisma
│   ├── src/
│   │   ├── modules/            auth · usuarios · clientes · equipos · productos
│   │   │                       lotes · inspecciones · certificados · reportes
│   │   ├── middlewares/
│   │   ├── lib/
│   │   └── config/
│   └── prisma/                 Schema y migraciones
├── frontend/                   Aplicación React + Vite
│   └── src/
│       ├── pages/              10 pantallas del sistema
│       ├── components/         UI reutilizable + shadcn
│       ├── stores/             auth store (Zustand)
│       ├── hooks/
│       └── lib/                cliente HTTP
├── compose.yaml                Orquestación Docker (Compose Specification)
└── .env.example                Plantilla de variables de entorno
```

---

## Puesta en marcha

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
| **Frontend** | http://localhost:5173 | Aplicación React |
| **Backend API** | http://localhost:3000 | API REST |
| **PostgreSQL** | `localhost:5432` | Base de datos |
| **Mailpit UI** | http://localhost:8025 | Bandeja de correo de desarrollo |

### Comandos útiles

```bash
docker compose up -d                                         # En segundo plano
docker compose logs -f backend                               # Ver logs del backend
docker compose exec backend sh                               # Shell en el contenedor
docker compose exec backend npx prisma migrate dev           # Nueva migración
docker compose exec backend npx prisma studio --port 5555 --hostname 0.0.0.0  # Explorador de BD (exponer puerto 5555 en compose.yaml o ejecutar fuera de Docker)
docker compose down                                          # Detener
```

---

## Roles del sistema

| Rol | Responsabilidades |
|---|---|
| **`ADMINISTRADOR`** | Gestiona usuarios del sistema (alta, edición, baja y asignación de roles) |
| **`LABORATORIO`** | Registra inspecciones y resultados de análisis |
| **`CONTROL_CALIDAD`** | Gestiona equipos, clientes y emite certificados |
| **`ASEGURAMIENTO_CALIDAD`** | Consulta reportes y auditoría |
| **`GERENTE_PLANTA`** | Consulta indicadores operativos |
| **`DIRECTOR_OPERACIONES`** | Consulta reportes ejecutivos |

---

## Reglas de negocio clave

- **Secuencia A-Z** — Las inspecciones de un lote se identifican con letras de la A a la Z (máx. 26 por lote).
- **Inspección ficticia** — Cuando un resultado queda fuera de especificación, se puede generar una inspección ajustada que consume una letra de la secuencia, con justificación obligatoria y preservando la original intacta.
- **Rangos contenidos** — Los valores de referencia de cliente deben estar dentro del rango internacional del parámetro.
- **Certificado inmutable** — Una vez emitido, no se edita. Las correcciones generan un nuevo certificado con nueva numeración.
- **Formato de número** — `CERT-AAAA-NNNNNN` con consecutivo que reinicia cada año.
- **Soft delete** — No se elimina físicamente ningún registro de negocio.

---

## Equipo 2

> Ingeniería en Sistemas y TI · Universidad Anáhuac México Norte · Facultad de Ingeniería

| Ícono | Rol | Apellidos, Nombres |
|:-:|---|---|
| <img src="https://cdn.simpleicons.org/vitest/6E9F18" width="18" alt="" /> | **QA · Documentación** | Martínez Villavicencio, Fernando Alexander |
| <img src="https://cdn.simpleicons.org/react/61DAFB" width="18" alt="" /> | **Frontend** | Olmos López, Mario Arturo |
| <img src="https://cdn.simpleicons.org/githubactions/2088FF" width="18" alt="" /> | **Líder Técnico · Diseño · DevOps · CI/CD** | Ortiz Pérez Vertti, Carlos Alberto |
| <img src="https://cdn.simpleicons.org/nodedotjs/5FA04E" width="18" alt="" /> | **Backend** | Pinto Ruíz, Juan Pablo |
| <img src="https://cdn.simpleicons.org/postgresql/4169E1" width="18" alt="" /> | **Base de datos** | Sánchez de la Torre, Mauricio |

**Profesor:** Nicolás Haidar Salazar
**Asignatura:** Desarrollo de Software

---

<div align="center">

<sub>© 2026 Equipo 2 · Fábrica de Harinas Elizondo, S.A. de C.V.</sub>

</div>
