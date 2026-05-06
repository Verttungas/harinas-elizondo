import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { idParamSchema } from "../../lib/schemas.js";
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  getUsuario,
  listUsuarios,
} from "./usuarios.controller.js";
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  listUsuariosQuerySchema,
} from "./usuarios.schemas.js";

const router = Router();

const soloAdministradores = requireRole("ADMINISTRADOR");

router.get(
  "/",
  requireAuth,
  soloAdministradores,
  validate({ query: listUsuariosQuerySchema }),
  listUsuarios,
);

router.get(
  "/:id",
  requireAuth,
  soloAdministradores,
  validate({ params: idParamSchema }),
  getUsuario,
);

router.post(
  "/",
  requireAuth,
  soloAdministradores,
  validate({ body: crearUsuarioSchema }),
  crearUsuario,
);

router.put(
  "/:id",
  requireAuth,
  soloAdministradores,
  validate({ params: idParamSchema, body: actualizarUsuarioSchema }),
  actualizarUsuario,
);

router.delete(
  "/:id",
  requireAuth,
  soloAdministradores,
  validate({ params: idParamSchema }),
  eliminarUsuario,
);

export default router;
