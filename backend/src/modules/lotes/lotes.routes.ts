import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  crearLote,
  getLote,
  getLoteSaldo,
  listLotes,
} from "./lotes.controller.js";
import { crearLoteSchema, listLotesQuerySchema } from "./lotes.schemas.js";
import { idParamSchema } from "../../lib/schemas.js";
import { crearInspeccionEnLote } from "../inspecciones/inspecciones.controller.js";
import {
  crearInspeccionSchema,
  loteParamSchema,
} from "../inspecciones/inspecciones.schemas.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  validate({ query: listLotesQuerySchema }),
  listLotes,
);

router.get(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  getLote,
);

router.get(
  "/:id/saldo",
  requireAuth,
  validate({ params: idParamSchema }),
  getLoteSaldo,
);

router.post(
  "/",
  requireAuth,
  requireRole("LABORATORIO", "CONTROL_CALIDAD"),
  validate({ body: crearLoteSchema }),
  crearLote,
);

router.post(
  "/:loteId/inspecciones",
  requireAuth,
  requireRole("LABORATORIO", "CONTROL_CALIDAD"),
  validate({ params: loteParamSchema, body: crearInspeccionSchema }),
  crearInspeccionEnLote,
);

export default router;
