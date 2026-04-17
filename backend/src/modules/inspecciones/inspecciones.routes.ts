import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { idParamSchema } from "../../lib/schemas.js";
import {
  actualizarInspeccion,
  cerrarInspeccion,
  crearInspeccionFicticia,
  getInspeccion,
  listInspecciones,
} from "./inspecciones.controller.js";
import {
  actualizarInspeccionSchema,
  crearFicticiaSchema,
  listInspeccionesQuerySchema,
} from "./inspecciones.schemas.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  validate({ query: listInspeccionesQuerySchema }),
  listInspecciones,
);

router.get(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  getInspeccion,
);

router.put(
  "/:id",
  requireAuth,
  requireRole("LABORATORIO", "CONTROL_CALIDAD"),
  validate({ params: idParamSchema, body: actualizarInspeccionSchema }),
  actualizarInspeccion,
);

router.post(
  "/:id/cerrar",
  requireAuth,
  requireRole("LABORATORIO", "CONTROL_CALIDAD"),
  validate({ params: idParamSchema }),
  cerrarInspeccion,
);

router.post(
  "/:id/ficticia",
  requireAuth,
  requireRole("CONTROL_CALIDAD"),
  validate({ params: idParamSchema, body: crearFicticiaSchema }),
  crearInspeccionFicticia,
);

export default router;
