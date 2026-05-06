-- ============================================================================
-- Agregar dirección de envío al certificado
-- (puede diferir del domicilio del cliente, p. ej. cuando el domicilio son las
--  oficinas y el embarque va a una bodega o sucursal distinta)
-- ============================================================================
ALTER TABLE "certificados" ADD COLUMN "direccion_envio" TEXT;
