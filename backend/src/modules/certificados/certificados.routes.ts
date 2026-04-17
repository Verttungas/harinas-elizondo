import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { idParamSchema } from "../../lib/schemas.js";
import {
  descargarPdf,
  emitirCertificado,
  getCertificado,
  listCertificados,
  reenviarCertificado,
} from "./certificados.controller.js";
import {
  emitirCertificadoSchema,
  listCertificadosQuerySchema,
} from "./certificados.schemas.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  validate({ query: listCertificadosQuerySchema }),
  listCertificados,
);

router.get(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  getCertificado,
);

router.get(
  "/:id/pdf",
  requireAuth,
  validate({ params: idParamSchema }),
  descargarPdf,
);

router.post(
  "/",
  requireAuth,
  requireRole("CONTROL_CALIDAD"),
  validate({ body: emitirCertificadoSchema }),
  emitirCertificado,
);

router.post(
  "/:id/reenviar",
  requireAuth,
  requireRole("CONTROL_CALIDAD"),
  validate({ params: idParamSchema }),
  reenviarCertificado,
);

export default router;
