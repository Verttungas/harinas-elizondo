import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  exportReporte,
  getCertificadosPorCliente,
  getDesviaciones,
  getFicticias,
  getParametros,
  getResumen,
} from "./reportes.controller.js";
import {
  certificadosPorClienteQuerySchema,
  desviacionesQuerySchema,
  exportQuerySchema,
  ficticiasQuerySchema,
  parametrosQuerySchema,
} from "./reportes.schemas.js";

const router = Router();

router.get("/resumen", requireAuth, getResumen);

router.get(
  "/parametros",
  requireAuth,
  validate({ query: parametrosQuerySchema }),
  getParametros,
);

router.get(
  "/certificados-por-cliente",
  requireAuth,
  validate({ query: certificadosPorClienteQuerySchema }),
  getCertificadosPorCliente,
);

router.get(
  "/desviaciones",
  requireAuth,
  validate({ query: desviacionesQuerySchema }),
  getDesviaciones,
);

router.get(
  "/ficticias",
  requireAuth,
  validate({ query: ficticiasQuerySchema }),
  getFicticias,
);

router.get(
  "/export",
  requireAuth,
  validate({ query: exportQuerySchema }),
  exportReporte,
);

export default router;
