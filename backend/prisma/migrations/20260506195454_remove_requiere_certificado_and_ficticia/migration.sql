-- ============================================================================
-- Eliminar bandera requiere_certificado del catálogo de clientes
-- (todos los clientes registrados reciben certificado de calidad)
-- ============================================================================
ALTER TABLE "clientes" DROP COLUMN "requiere_certificado";

-- ============================================================================
-- Eliminar inspecciones ficticias: se trabaja únicamente con inspecciones reales
-- ============================================================================
ALTER TABLE "inspecciones" DROP CONSTRAINT IF EXISTS "inspecciones_inspeccion_origen_id_fkey";
ALTER TABLE "inspecciones" DROP COLUMN "es_ficticia";
ALTER TABLE "inspecciones" DROP COLUMN "inspeccion_origen_id";
ALTER TABLE "inspecciones" DROP COLUMN "justificacion_ajuste";
