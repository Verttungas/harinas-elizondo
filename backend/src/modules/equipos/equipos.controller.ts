import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { equiposService } from "./equipos.service.js";
import type {
  ActualizarEquipoInput,
  ActualizarParametroInput,
  CrearEquipoInput,
  CrearParametroInput,
  DarBajaEquipoInput,
  InactivarEquipoInput,
  ListEquiposQuery,
} from "./equipos.schemas.js";
import type { IdParam, ParametroParams } from "../../lib/schemas.js";

function currentUserId(req: Request): bigint {
  return (req as AuthenticatedRequest).user.id;
}

export async function listEquipos(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await equiposService.list(req.query as unknown as ListEquiposQuery);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getEquipo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const equipo = await equiposService.getById(id);
    res.status(200).json(equipo);
  } catch (err) {
    next(err);
  }
}

export async function crearEquipo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const equipo = await equiposService.crear(
      req.body as CrearEquipoInput,
      currentUserId(req),
    );
    res
      .status(201)
      .location(`/api/v1/equipos/${equipo.id.toString()}`)
      .json(equipo);
  } catch (err) {
    next(err);
  }
}

export async function actualizarEquipo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const equipo = await equiposService.actualizar(
      id,
      req.body as ActualizarEquipoInput,
      currentUserId(req),
    );
    res.status(200).json(equipo);
  } catch (err) {
    next(err);
  }
}

export async function agregarParametro(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const parametro = await equiposService.agregarParametro(
      id,
      req.body as CrearParametroInput,
      currentUserId(req),
    );
    res
      .status(201)
      .location(`/api/v1/equipos/${id.toString()}/parametros/${parametro.id.toString()}`)
      .json(parametro);
  } catch (err) {
    next(err);
  }
}

export async function actualizarParametro(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, paramId } = req.params as unknown as ParametroParams;
    const parametro = await equiposService.actualizarParametro(
      id,
      paramId,
      req.body as ActualizarParametroInput,
      currentUserId(req),
    );
    res.status(200).json(parametro);
  } catch (err) {
    next(err);
  }
}

export async function inactivarParametro(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, paramId } = req.params as unknown as ParametroParams;
    await equiposService.inactivarParametro(id, paramId, currentUserId(req));
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function inactivarEquipo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const body = req.body as InactivarEquipoInput;
    const equipo = await equiposService.inactivar(id, body.motivo, currentUserId(req));
    res.status(200).json(equipo);
  } catch (err) {
    next(err);
  }
}

export async function darBajaEquipo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const body = req.body as DarBajaEquipoInput;
    const equipo = await equiposService.darBaja(id, body.motivo, currentUserId(req));
    res.status(200).json(equipo);
  } catch (err) {
    next(err);
  }
}
