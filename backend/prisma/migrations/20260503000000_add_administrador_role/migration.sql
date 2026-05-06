ALTER TYPE "rol_usuario" ADD VALUE IF NOT EXISTS 'ADMINISTRADOR';

CREATE TABLE IF NOT EXISTS "reportes_guardados" (
  "id" BIGSERIAL PRIMARY KEY,
  "nombre" VARCHAR(120) NOT NULL,
  "descripcion" TEXT,
  "tipo" VARCHAR(40) NOT NULL,
  "filtros" JSONB NOT NULL DEFAULT '{}',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_por" BIGINT NOT NULL REFERENCES "usuarios"("id"),
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "reportes_guardados_tipo_idx" ON "reportes_guardados"("tipo");
CREATE INDEX IF NOT EXISTS "reportes_guardados_activo_idx" ON "reportes_guardados"("activo");
