# FHESA — Sistema de Emisión de Certificados de Calidad

Aplicación web para **Fábrica de Harinas Elizondo, S.A. de C.V.** que gestiona
la emisión de certificados de calidad a clientes a partir de análisis de
laboratorio sobre lotes de producción.

> Proyecto académico. Universidad Anáhuac, Facultad de Ingeniería.
> Asignatura: Desarrollo de Software. Entrega final: 1 de mayo de 2026.

## Stack

- **Backend:** Node.js 22 + Express + TypeScript + Prisma
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Base de datos:** PostgreSQL 16
- **Correo (dev):** MailHog
- **Orquestación:** Docker Compose

## Requisitos

- Docker 24+ con Docker Compose V2
- Git
- Editor con soporte para TypeScript (recomendado: VS Code)

No necesitas Node.js instalado en tu máquina: todo se ejecuta en contenedores.

## Arranque rápido

1. Clona el repositorio y entra al directorio:

   ```bash
   git clone <url-del-repo> harinas-elizondo
   cd harinas-elizondo
   ```

2. Crea tu archivo de variables de entorno:

   ```bash
   cp .env.example .env
   ```

3. Construye las imágenes y levanta los servicios:

   ```bash
   docker compose build
   docker compose up -d
   ```

4. Aplica la migración inicial de Prisma (una sola vez en el primer arranque):

   ```bash
   docker compose exec backend npx prisma migrate dev --name init_healthcheck
   ```

5. Verifica que todo responde:

   - Frontend: <http://localhost:5173>
   - Backend (health): <http://localhost:3000/api/v1/health>
   - MailHog (UI): <http://localhost:8025>

## Comandos frecuentes

```bash
# Ver logs de un servicio
docker compose logs -f backend
docker compose logs -f frontend

# Detener servicios
docker compose down

# Detener y borrar volúmenes (DESTRUCTIVO — borra la base de datos)
docker compose down -v

# Entrar al contenedor backend
docker compose exec backend sh

# Regenerar cliente de Prisma
docker compose exec backend npx prisma generate

# Crear una nueva migración
docker compose exec backend npx prisma migrate dev --name <descripcion>
```

## Estructura

```
harinas-elizondo/
├── compose.yaml          Orquestación Docker
├── .env.example          Plantilla de variables de entorno
├── backend/              Servicio Express + Prisma
├── frontend/             Aplicación React + Vite
├── diagrams/             Diagramas PlantUML
└── docs/                 Documentación y prompts por fase
```

## Estado del proyecto

- **Fase A (infraestructura inicial):** en curso / completada.
- Fases B–I: pendientes. Cada fase tiene su prompt en `docs/prompts/`.
