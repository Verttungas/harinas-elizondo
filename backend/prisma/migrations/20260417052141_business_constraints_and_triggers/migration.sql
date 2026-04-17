-- ============================================================================
-- CHECK CONSTRAINTS
-- ============================================================================

-- Parámetros: límite inferior < límite superior (RN-06)
ALTER TABLE parametros
  ADD CONSTRAINT parametros_limites_check
  CHECK (limite_inferior < limite_superior);

-- Valores de referencia cliente: límite inferior < límite superior
ALTER TABLE valores_referencia_cliente
  ADD CONSTRAINT vrc_limites_check
  CHECK (limite_inferior < limite_superior);

-- Inspecciones: secuencia A-Z (RN-22)
ALTER TABLE inspecciones
  ADD CONSTRAINT inspecciones_secuencia_check
  CHECK (secuencia >= 'A' AND secuencia <= 'Z');

-- Certificados: fecha_caducidad >= fecha_envio
ALTER TABLE certificados
  ADD CONSTRAINT certificados_fechas_check
  CHECK (fecha_caducidad IS NULL OR fecha_envio IS NULL OR fecha_caducidad >= fecha_envio);

-- ============================================================================
-- TRIGGER: Validar que rango del cliente esté contenido en el internacional
-- Implementa RN-12
-- ============================================================================

CREATE OR REPLACE FUNCTION validar_rango_cliente()
RETURNS TRIGGER AS $$
DECLARE
  int_inf DECIMAL(12,4);
  int_sup DECIMAL(12,4);
BEGIN
  SELECT limite_inferior, limite_superior INTO int_inf, int_sup
  FROM parametros WHERE id = NEW.parametro_id;

  IF NEW.limite_inferior < int_inf THEN
    RAISE EXCEPTION 'El límite inferior del cliente (%) debe ser >= al límite inferior internacional (%)',
      NEW.limite_inferior, int_inf;
  END IF;

  IF NEW.limite_superior > int_sup THEN
    RAISE EXCEPTION 'El límite superior del cliente (%) debe ser <= al límite superior internacional (%)',
      NEW.limite_superior, int_sup;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_rango_cliente
  BEFORE INSERT OR UPDATE ON valores_referencia_cliente
  FOR EACH ROW
  EXECUTE FUNCTION validar_rango_cliente();

-- ============================================================================
-- TRIGGER: Asignar automáticamente la siguiente letra de secuencia
-- Implementa RN-22, RN-23, RN-27, RN-28
-- ============================================================================

CREATE OR REPLACE FUNCTION asignar_secuencia_inspeccion()
RETURNS TRIGGER AS $$
DECLARE
  ultima_letra CHAR(1);
  siguiente_letra CHAR(1);
BEGIN
  -- Si se proporciona secuencia explícita (caso de seed o tests), validarla
  IF NEW.secuencia IS NOT NULL AND NEW.secuencia != '' THEN
    IF EXISTS (
      SELECT 1 FROM inspecciones
      WHERE lote_id = NEW.lote_id AND secuencia = NEW.secuencia
    ) THEN
      RAISE EXCEPTION 'La secuencia % ya existe para el lote %', NEW.secuencia, NEW.lote_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Asignar automáticamente la siguiente letra
  SELECT MAX(secuencia) INTO ultima_letra
  FROM inspecciones WHERE lote_id = NEW.lote_id;

  IF ultima_letra IS NULL THEN
    siguiente_letra := 'A';
  ELSE
    IF ultima_letra = 'Z' THEN
      RAISE EXCEPTION 'El lote % ya alcanzó la secuencia máxima Z (26 inspecciones)', NEW.lote_id;
    END IF;
    siguiente_letra := CHR(ASCII(ultima_letra) + 1);
  END IF;

  NEW.secuencia := siguiente_letra;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asignar_secuencia_inspeccion
  BEFORE INSERT ON inspecciones
  FOR EACH ROW
  EXECUTE FUNCTION asignar_secuencia_inspeccion();

-- ============================================================================
-- TRIGGER: Calcular desviación y dentro_especificacion al registrar resultado
-- Implementa RN-24
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_resultado_inspeccion()
RETURNS TRIGGER AS $$
DECLARE
  lim_inf DECIMAL(12,4);
  lim_sup DECIMAL(12,4);
  valor_central DECIMAL(12,4);
BEGIN
  SELECT limite_inferior, limite_superior INTO lim_inf, lim_sup
  FROM parametros WHERE id = NEW.parametro_id;

  valor_central := (lim_inf + lim_sup) / 2;
  NEW.desviacion := NEW.valor - valor_central;
  NEW.dentro_especificacion := (NEW.valor >= lim_inf AND NEW.valor <= lim_sup);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_resultado_inspeccion
  BEFORE INSERT OR UPDATE ON resultados_inspeccion
  FOR EACH ROW
  EXECUTE FUNCTION calcular_resultado_inspeccion();
