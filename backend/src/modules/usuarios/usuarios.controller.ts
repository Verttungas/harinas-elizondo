import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import type { IdParam } from "../../lib/schemas.js";
import { usuariosService } from "./usuarios.service.js";
import type {
  ActualizarUsuarioInput,
  CrearUsuarioInput,
  ListUsuariosQuery,
} from "./usuarios.schemas.js";

function currentUserId(req: Request): bigint {
  return (req as AuthenticatedRequest).user.id;
}

export async function listUsuarios(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await usuariosService.list(
      req.query as unknown as ListUsuariosQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUsuario(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const usuario = await usuariosService.getById(id);
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}

export async function crearUsuario(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const usuario = await usuariosService.crear(
      req.body as CrearUsuarioInput,
      currentUserId(req),
    );
    res
      .status(201)
      .location(`/api/v1/usuarios/${usuario.id.toString()}`)
      .json(usuario);
  } catch (err) {
    next(err);
  }
}

export async function actualizarUsuario(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const usuario = await usuariosService.actualizar(
      id,
      req.body as ActualizarUsuarioInput,
      currentUserId(req),
    );
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}

export async function eliminarUsuario(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const usuario = await usuariosService.eliminar(id, currentUserId(req));
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}
