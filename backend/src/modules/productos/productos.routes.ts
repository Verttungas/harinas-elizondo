import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { crearProducto, listProductos } from "./productos.controller.js";
import {
  crearProductoSchema,
  listProductosQuerySchema,
} from "./productos.schemas.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  validate({ query: listProductosQuerySchema }),
  listProductos,
);

router.post(
  "/",
  requireAuth,
  requireRole("CONTROL_CALIDAD"),
  validate({ body: crearProductoSchema }),
  crearProducto,
);

export default router;
