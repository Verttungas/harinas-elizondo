import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  actualizarReporteGuardado,
  crearReporteGuardado,
  eliminarReporteGuardado,
  exportReporte,
  getCertificadosPorCliente,
  getDesviaciones,
  getFicticias,
  getParametros,
  getResumen,
  listReportesGuardados,
} from "./reportes.controller.js";
import {
  actualizarReporteGuardadoSchema,
  certificadosPorClienteQuerySchema,
  crearReporteGuardadoSchema,
  desviacionesQuerySchema,
  exportQuerySchema,
  ficticiasQuerySchema,
  listReportesGuardadosQuerySchema,
  parametrosQuerySchema,
} from "./reportes.schemas.js";
import { idParamSchema } from "../../lib/schemas.js";

const router = Router();

const rolesReportes = requireRole(
  "CONTROL_CALIDAD",
  "ASEGURAMIENTO_CALIDAD",
  "GERENTE_PLANTA",
  "DIRECTOR_OPERACIONES",
);

const soloAdministradores = requireRole("ADMINISTRADOR");

router.get(
  "/guardados",
  requireAuth,
  soloAdministradores,
  validate({ query: listReportesGuardadosQuerySchema }),
  listReportesGuardados,
);

router.post(
  "/guardados",
  requireAuth,
  soloAdministradores,
  validate({ body: crearReporteGuardadoSchema }),
  crearReporteGuardado,
);

router.put(
  "/guardados/:id",
  requireAuth,
  soloAdministradores,
  validate({ params: idParamSchema, body: actualizarReporteGuardadoSchema }),
  actualizarReporteGuardado,
);

router.delete(
  "/guardados/:id",
  requireAuth,
  soloAdministradores,
  validate({ params: idParamSchema }),
  eliminarReporteGuardado,
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
  "/ficticias",
  requireAuth,
  rolesReportes,
  validate({ query: ficticiasQuerySchema }),
  getFicticias,
);

router.get(
  "/export",
  requireAuth,
  rolesReportes,
  validate({ query: exportQuerySchema }),
  exportReporte,
);

export default router;
