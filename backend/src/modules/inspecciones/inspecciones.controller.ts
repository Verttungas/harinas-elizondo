import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import type { IdParam } from "../../lib/schemas.js";
import { inspeccionesService } from "./inspecciones.service.js";
import type {
  ActualizarInspeccionInput,
  CrearInspeccionInput,
  ListInspeccionesQuery,
  LoteParam,
} from "./inspecciones.schemas.js";

export async function listInspecciones(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListInspeccionesQuery;
    const result = await inspeccionesService.list(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getInspeccion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const inspeccion = await inspeccionesService.getById(id);
    res.status(200).json(inspeccion);
  } catch (err) {
    next(err);
  }
}

export async function crearInspeccionEnLote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { loteId } = req.params as unknown as LoteParam;
    const body = req.body as CrearInspeccionInput;
    const user = (req as AuthenticatedRequest).user;
    const inspeccion = await inspeccionesService.crearEnLote(
      loteId,
      body,
      user.id,
    );
    res
      .status(201)
      .location(`/api/v1/inspecciones/${inspeccion!.id.toString()}`)
      .json(inspeccion);
  } catch (err) {
    next(err);
  }
}

export async function actualizarInspeccion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const body = req.body as ActualizarInspeccionInput;
    const user = (req as AuthenticatedRequest).user;
    const inspeccion = await inspeccionesService.actualizar(id, body, user.id);
    res.status(200).json(inspeccion);
  } catch (err) {
    next(err);
  }
}

export async function cerrarInspeccion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const user = (req as AuthenticatedRequest).user;
    const inspeccion = await inspeccionesService.cerrar(id, user.id);
    res.status(200).json(inspeccion);
  } catch (err) {
    next(err);
  }
}

