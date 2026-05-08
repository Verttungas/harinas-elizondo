import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  actualizarEquipo,
  actualizarParametro,
  agregarParametro,
  crearEquipo,
  darBajaEquipo,
  getEquipo,
  inactivarEquipo,
  inactivarParametro,
  listEquipos,
} from "./equipos.controller.js";
import {
  actualizarEquipoSchema,
  actualizarParametroSchema,
  crearEquipoSchema,
  crearParametroSchema,
  darBajaEquipoSchema,
  inactivarEquipoSchema,
  listEquiposQuerySchema,
} from "./equipos.schemas.js";
import { idParamSchema, parametroParamsSchema } from "../../lib/schemas.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  validate({ query: listEquiposQuerySchema }),
  listEquipos,
);

router.get(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  getEquipo,
);

const rolesEscrituraEquipos = requireRole(
  "CONTROL_CALIDAD",
  "LABORATORIO",
  "GERENTE_PLANTA",
);

router.post(
  "/",
  requireAuth,
  rolesEscrituraEquipos,
  validate({ body: crearEquipoSchema }),
  crearEquipo,
);

router.put(
  "/:id",
  requireAuth,
  rolesEscrituraEquipos,
  validate({ params: idParamSchema, body: actualizarEquipoSchema }),
  actualizarEquipo,
);

router.post(
  "/:id/parametros",
  requireAuth,
  rolesEscrituraEquipos,
  validate({ params: idParamSchema, body: crearParametroSchema }),
  agregarParametro,
);

router.put(
  "/:id/parametros/:paramId",
  requireAuth,
  rolesEscrituraEquipos,
  validate({ params: parametroParamsSchema, body: actualizarParametroSchema }),
  actualizarParametro,
);

router.delete(
  "/:id/parametros/:paramId",
  requireAuth,
  rolesEscrituraEquipos,
  validate({ params: parametroParamsSchema }),
  inactivarParametro,
);

router.post(
  "/:id/inactivar",
  requireAuth,
  rolesEscrituraEquipos,
  validate({ params: idParamSchema, body: inactivarEquipoSchema }),
  inactivarEquipo,
);

router.post(
  "/:id/baja",
  requireAuth,
  rolesEscrituraEquipos,
  validate({ params: idParamSchema, body: darBajaEquipoSchema }),
  darBajaEquipo,
);

export default router;
