import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { idParamSchema } from "../../lib/schemas.js";
import {
  actualizarInspeccion,
  cerrarInspeccion,
  getInspeccion,
  listInspecciones,
} from "./inspecciones.controller.js";
import {
  actualizarInspeccionSchema,
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

export default router;
