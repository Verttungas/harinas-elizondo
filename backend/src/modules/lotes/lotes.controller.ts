import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { lotesService } from "./lotes.service.js";
import type { CrearLoteInput, ListLotesQuery } from "./lotes.schemas.js";
import type { IdParam } from "../../lib/schemas.js";

export async function listLotes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListLotesQuery;
    const result = await lotesService.list(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getLote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const lote = await lotesService.getById(id);
    res.status(200).json(lote);
  } catch (err) {
    next(err);
  }
}

export async function getLoteSaldo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const saldo = await lotesService.getSaldo(id);
    res.status(200).json(saldo);
  } catch (err) {
    next(err);
  }
}

export async function crearLote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CrearLoteInput;
    const user = (req as AuthenticatedRequest).user;
    const lote = await lotesService.crear(body, user.id);
    res
      .status(201)
      .location(`/api/v1/lotes/${lote.id.toString()}`)
      .json(lote);
  } catch (err) {
    next(err);
  }
}
