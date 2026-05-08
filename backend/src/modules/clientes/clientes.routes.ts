import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  actualizarCliente,
  actualizarValorReferencia,
  agregarValorReferencia,
  crearCliente,
  eliminarValorReferencia,
  getCliente,
  inactivarCliente,
  listClientes,
  reactivarCliente,
} from "./clientes.controller.js";
import {
  actualizarClienteSchema,
  actualizarValorReferenciaSchema,
  agregarValorReferenciaSchema,
  crearClienteSchema,
  inactivarClienteSchema,
  listClientesQuerySchema,
} from "./clientes.schemas.js";
import { idParamSchema, valorReferenciaParamsSchema } from "../../lib/schemas.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  validate({ query: listClientesQuerySchema }),
  listClientes,
);

router.get(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  getCliente,
);

const rolesEscrituraClientes = requireRole(
  "CONTROL_CALIDAD",
  "LABORATORIO",
  "GERENTE_PLANTA",
);

router.post(
  "/",
  requireAuth,
  rolesEscrituraClientes,
  validate({ body: crearClienteSchema }),
  crearCliente,
);

router.put(
  "/:id",
  requireAuth,
  rolesEscrituraClientes,
  validate({ params: idParamSchema, body: actualizarClienteSchema }),
  actualizarCliente,
);

router.post(
  "/:id/valores-referencia",
  requireAuth,
  rolesEscrituraClientes,
  validate({ params: idParamSchema, body: agregarValorReferenciaSchema }),
  agregarValorReferencia,
);

router.put(
  "/:id/valores-referencia/:vrId",
  requireAuth,
  rolesEscrituraClientes,
  validate({
    params: valorReferenciaParamsSchema,
    body: actualizarValorReferenciaSchema,
  }),
  actualizarValorReferencia,
);

router.delete(
  "/:id/valores-referencia/:vrId",
  requireAuth,
  rolesEscrituraClientes,
  validate({ params: valorReferenciaParamsSchema }),
  eliminarValorReferencia,
);

router.post(
  "/:id/inactivar",
  requireAuth,
  rolesEscrituraClientes,
  validate({ params: idParamSchema, body: inactivarClienteSchema }),
  inactivarCliente,
);

router.post(
  "/:id/reactivar",
  requireAuth,
  rolesEscrituraClientes,
  validate({ params: idParamSchema }),
  reactivarCliente,
);

export default router;
