import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import type { IdParam } from "../../lib/schemas.js";
import { certificadosService } from "./certificados.service.js";
import type {
  EmitirCertificadoInput,
  ListCertificadosQuery,
} from "./certificados.schemas.js";

export async function listCertificados(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListCertificadosQuery;
    const result = await certificadosService.list(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCertificado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const certificado = await certificadosService.getById(id);
    res.status(200).json(certificado);
  } catch (err) {
    next(err);
  }
}

export async function emitirCertificado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as EmitirCertificadoInput;
    const user = (req as AuthenticatedRequest).user;
    const certificado = await certificadosService.emitir(body, user.id);
    res
      .status(201)
      .location(`/api/v1/certificados/${certificado.id.toString()}`)
      .json(certificado);
  } catch (err) {
    next(err);
  }
}

export async function descargarPdf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const ruta = await certificadosService.getPdfPath(id);
    res.sendFile(ruta);
  } catch (err) {
    next(err);
  }
}

export async function reenviarCertificado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const user = (req as AuthenticatedRequest).user;
    const certificado = await certificadosService.reenviar(id, user.id);
    res.status(200).json(certificado);
  } catch (err) {
    next(err);
  }
}
