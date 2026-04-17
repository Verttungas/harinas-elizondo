-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('LABORATORIO', 'CONTROL_CALIDAD', 'ASEGURAMIENTO_CALIDAD', 'GERENTE_PLANTA', 'DIRECTOR_OPERACIONES');

-- CreateEnum
CREATE TYPE "estado_equipo" AS ENUM ('ACTIVO', 'INACTIVO', 'BAJA');

-- CreateEnum
CREATE TYPE "estado_cliente" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "estado_inspeccion" AS ENUM ('BORRADOR', 'CERRADA');

-- CreateEnum
CREATE TYPE "estado_certificado" AS ENUM ('EMITIDO', 'ENVIO_PARCIAL', 'ENVIADO');

-- CreateEnum
CREATE TYPE "estado_envio" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "destinatario_tipo" AS ENUM ('CLIENTE', 'ALMACEN');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" BIGSERIAL NOT NULL,
    "correo" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "rol" "rol_usuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "intentos_fallidos" SMALLINT NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" BIGSERIAL NOT NULL,
    "clave" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos_laboratorio" (
    "id" BIGSERIAL NOT NULL,
    "clave" VARCHAR(20) NOT NULL,
    "descripcion_corta" VARCHAR(80) NOT NULL,
    "descripcion_larga" TEXT,
    "marca" VARCHAR(60),
    "modelo" VARCHAR(60),
    "serie" VARCHAR(60),
    "proveedor" VARCHAR(120),
    "fecha_adquisicion" DATE,
    "vigencia_garantia" DATE,
    "ubicacion" VARCHAR(120),
    "responsable" VARCHAR(120),
    "estado" "estado_equipo" NOT NULL DEFAULT 'ACTIVO',
    "motivo_baja" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" BIGINT NOT NULL,
    "actualizado_por" BIGINT NOT NULL,

    CONSTRAINT "equipos_laboratorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros" (
    "id" BIGSERIAL NOT NULL,
    "equipo_id" BIGINT NOT NULL,
    "clave" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "unidad_medida" VARCHAR(20) NOT NULL,
    "desviacion_aceptable" DECIMAL(10,4),
    "limite_inferior" DECIMAL(12,4) NOT NULL,
    "limite_superior" DECIMAL(12,4) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parametros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" BIGSERIAL NOT NULL,
    "clave_sap" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "domicilio" TEXT,
    "contacto_nombre" VARCHAR(120),
    "contacto_correo" VARCHAR(120),
    "contacto_telefono" VARCHAR(20),
    "requiere_certificado" BOOLEAN NOT NULL DEFAULT true,
    "estado" "estado_cliente" NOT NULL DEFAULT 'ACTIVO',
    "motivo_inactivacion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" BIGINT NOT NULL,
    "actualizado_por" BIGINT NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valores_referencia_cliente" (
    "id" BIGSERIAL NOT NULL,
    "cliente_id" BIGINT NOT NULL,
    "parametro_id" BIGINT NOT NULL,
    "limite_inferior" DECIMAL(12,4) NOT NULL,
    "limite_superior" DECIMAL(12,4) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valores_referencia_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes_produccion" (
    "id" BIGSERIAL NOT NULL,
    "numero_lote" VARCHAR(30) NOT NULL,
    "producto_id" BIGINT NOT NULL,
    "fecha_produccion" DATE NOT NULL,
    "cantidad_producida" DECIMAL(12,2),
    "unidad_cantidad" VARCHAR(20),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" BIGINT NOT NULL,

    CONSTRAINT "lotes_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones" (
    "id" BIGSERIAL NOT NULL,
    "lote_id" BIGINT NOT NULL,
    "secuencia" CHAR(1) NOT NULL,
    "fecha_inspeccion" TIMESTAMP(3) NOT NULL,
    "estado" "estado_inspeccion" NOT NULL DEFAULT 'BORRADOR',
    "es_ficticia" BOOLEAN NOT NULL DEFAULT false,
    "inspeccion_origen_id" BIGINT,
    "justificacion_ajuste" TEXT,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" BIGINT NOT NULL,

    CONSTRAINT "inspecciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultados_inspeccion" (
    "id" BIGSERIAL NOT NULL,
    "inspeccion_id" BIGINT NOT NULL,
    "parametro_id" BIGINT NOT NULL,
    "valor" DECIMAL(12,4) NOT NULL,
    "desviacion" DECIMAL(12,4),
    "dentro_especificacion" BOOLEAN NOT NULL,

    CONSTRAINT "resultados_inspeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados" (
    "id" BIGSERIAL NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "cliente_id" BIGINT NOT NULL,
    "lote_id" BIGINT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "estado_certificado" NOT NULL DEFAULT 'EMITIDO',
    "ruta_pdf" VARCHAR(255),
    "num_orden_compra" VARCHAR(50),
    "cantidad_solicitada" DECIMAL(12,2),
    "cantidad_entrega" DECIMAL(12,2),
    "num_factura" VARCHAR(50),
    "fecha_envio" DATE,
    "fecha_caducidad" DATE,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" BIGINT NOT NULL,

    CONSTRAINT "certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificado_inspeccion" (
    "certificado_id" BIGINT NOT NULL,
    "inspeccion_id" BIGINT NOT NULL,
    "orden" SMALLINT,

    CONSTRAINT "certificado_inspeccion_pkey" PRIMARY KEY ("certificado_id","inspeccion_id")
);

-- CreateTable
CREATE TABLE "envios_certificado" (
    "id" BIGSERIAL NOT NULL,
    "certificado_id" BIGINT NOT NULL,
    "destinatario_tipo" "destinatario_tipo" NOT NULL,
    "destinatario_correo" VARCHAR(120) NOT NULL,
    "estado" "estado_envio" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" SMALLINT NOT NULL DEFAULT 0,
    "ultimo_error" TEXT,
    "enviado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envios_certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "entidad_id" BIGINT NOT NULL,
    "accion" VARCHAR(30) NOT NULL,
    "detalle" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_clave_key" ON "productos"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_laboratorio_clave_key" ON "equipos_laboratorio"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_equipo_id_clave_key" ON "parametros"("equipo_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_clave_sap_key" ON "clientes"("clave_sap");

-- CreateIndex
CREATE UNIQUE INDEX "valores_referencia_cliente_cliente_id_parametro_id_key" ON "valores_referencia_cliente"("cliente_id", "parametro_id");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_produccion_numero_lote_key" ON "lotes_produccion"("numero_lote");

-- CreateIndex
CREATE INDEX "inspecciones_estado_idx" ON "inspecciones"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "inspecciones_lote_id_secuencia_key" ON "inspecciones"("lote_id", "secuencia");

-- CreateIndex
CREATE UNIQUE INDEX "resultados_inspeccion_inspeccion_id_parametro_id_key" ON "resultados_inspeccion"("inspeccion_id", "parametro_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_numero_key" ON "certificados"("numero");

-- CreateIndex
CREATE INDEX "certificados_cliente_id_fecha_emision_idx" ON "certificados"("cliente_id", "fecha_emision" DESC);

-- CreateIndex
CREATE INDEX "certificados_fecha_emision_idx" ON "certificados"("fecha_emision" DESC);

-- CreateIndex
CREATE INDEX "envios_certificado_estado_idx" ON "envios_certificado"("estado");

-- CreateIndex
CREATE INDEX "bitacora_entidad_entidad_id_creado_en_idx" ON "bitacora"("entidad", "entidad_id", "creado_en" DESC);

-- AddForeignKey
ALTER TABLE "equipos_laboratorio" ADD CONSTRAINT "equipos_laboratorio_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_laboratorio" ADD CONSTRAINT "equipos_laboratorio_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametros" ADD CONSTRAINT "parametros_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos_laboratorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valores_referencia_cliente" ADD CONSTRAINT "valores_referencia_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valores_referencia_cliente" ADD CONSTRAINT "valores_referencia_cliente_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_produccion" ADD CONSTRAINT "lotes_produccion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_produccion" ADD CONSTRAINT "lotes_produccion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_inspeccion_origen_id_fkey" FOREIGN KEY ("inspeccion_origen_id") REFERENCES "inspecciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_inspeccion" ADD CONSTRAINT "resultados_inspeccion_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_inspeccion" ADD CONSTRAINT "resultados_inspeccion_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificado_inspeccion" ADD CONSTRAINT "certificado_inspeccion_certificado_id_fkey" FOREIGN KEY ("certificado_id") REFERENCES "certificados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificado_inspeccion" ADD CONSTRAINT "certificado_inspeccion_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspecciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios_certificado" ADD CONSTRAINT "envios_certificado_certificado_id_fkey" FOREIGN KEY ("certificado_id") REFERENCES "certificados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
