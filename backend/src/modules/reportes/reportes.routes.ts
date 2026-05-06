import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  exportReporte,
  getCertificadosPorCliente,
  getDesviaciones,
  getParametros,
  getResumen,
} from "./reportes.controller.js";
import {
  certificadosPorClienteQuerySchema,
  desviacionesQuerySchema,
  exportQuerySchema,
  parametrosQuerySchema,
} from "./reportes.schemas.js";

const router = Router();

const rolesReportes = requireRole(
  "CONTROL_CALIDAD",
  "ASEGURAMIENTO_CALIDAD",
  "GERENTE_PLANTA",
  "DIRECTOR_OPERACIONES",
);

router.get("/resumen", requireAuth, rolesReportes, getResumen);

router.get(
  "/parametros",
  requireAuth,
  rolesReportes,
  validate({ query: parametrosQuerySchema }),
  getParametros,
);

router.get(
  "/certificados-por-cliente",
  requireAuth,
  rolesReportes,
  validate({ query: certificadosPorClienteQuerySchema }),
  getCertificadosPorCliente,
);

router.get(
  "/desviaciones",
  requireAuth,
  rolesReportes,
  validate({ query: desviacionesQuerySchema }),
  getDesviaciones,
);

router.get(
  "/export",
  requireAuth,
  rolesReportes,
  validate({ query: exportQuerySchema }),
  exportReporte,
);

export default router;
