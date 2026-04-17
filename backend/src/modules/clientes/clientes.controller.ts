import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { clientesService } from "./clientes.service.js";
import type {
  ActualizarClienteInput,
  ActualizarValorReferenciaInput,
  AgregarValorReferenciaInput,
  CrearClienteInput,
  InactivarClienteInput,
  ListClientesQuery,
} from "./clientes.schemas.js";
import type { IdParam, ValorReferenciaParams } from "../../lib/schemas.js";

function currentUserId(req: Request): bigint {
  return (req as AuthenticatedRequest).user.id;
}

export async function listClientes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await clientesService.list(
      req.query as unknown as ListClientesQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCliente(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const cliente = await clientesService.getById(id);
    res.status(200).json(cliente);
  } catch (err) {
    next(err);
  }
}

export async function crearCliente(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cliente = await clientesService.crear(
      req.body as CrearClienteInput,
      currentUserId(req),
    );
    res
      .status(201)
      .location(`/api/v1/clientes/${cliente.id.toString()}`)
      .json(cliente);
  } catch (err) {
    next(err);
  }
}

export async function actualizarCliente(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const cliente = await clientesService.actualizar(
      id,
      req.body as ActualizarClienteInput,
      currentUserId(req),
    );
    res.status(200).json(cliente);
  } catch (err) {
    next(err);
  }
}

export async function agregarValorReferencia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const vr = await clientesService.agregarValorReferencia(
      id,
      req.body as AgregarValorReferenciaInput,
      currentUserId(req),
    );
    res
      .status(201)
      .location(`/api/v1/clientes/${id.toString()}/valores-referencia/${vr.id.toString()}`)
      .json(vr);
  } catch (err) {
    next(err);
  }
}

export async function actualizarValorReferencia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, vrId } = req.params as unknown as ValorReferenciaParams;
    const vr = await clientesService.actualizarValorReferencia(
      id,
      vrId,
      req.body as ActualizarValorReferenciaInput,
      currentUserId(req),
    );
    res.status(200).json(vr);
  } catch (err) {
    next(err);
  }
}

export async function eliminarValorReferencia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, vrId } = req.params as unknown as ValorReferenciaParams;
    await clientesService.eliminarValorReferencia(id, vrId, currentUserId(req));
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function inactivarCliente(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const body = req.body as InactivarClienteInput;
    const cliente = await clientesService.inactivar(id, body.motivo, currentUserId(req));
    res.status(200).json(cliente);
  } catch (err) {
    next(err);
  }
}

export async function reactivarCliente(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const cliente = await clientesService.reactivar(id, currentUserId(req));
    res.status(200).json(cliente);
  } catch (err) {
    next(err);
  }
}
