import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import type { IdParam } from "../../lib/schemas.js";
import { reportesService } from "./reportes.service.js";
import type {
  ActualizarReporteGuardadoInput,
  CertificadosPorClienteQuery,
  CrearReporteGuardadoInput,
  DesviacionesQuery,
  ExportQuery,
  FicticiasQuery,
  ListReportesGuardadosQuery,
  ParametrosQuery,
} from "./reportes.schemas.js";

function currentUserId(req: Request): bigint {
  return (req as AuthenticatedRequest).user.id;
}

export async function listReportesGuardados(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reportesService.listGuardados(
      req.query as unknown as ListReportesGuardadosQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function crearReporteGuardado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporte = await reportesService.crearGuardado(
      req.body as CrearReporteGuardadoInput,
      currentUserId(req),
    );
    res.status(201).json(reporte);
  } catch (err) {
    next(err);
  }
}

export async function actualizarReporteGuardado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const reporte = await reportesService.actualizarGuardado(
      id,
      req.body as ActualizarReporteGuardadoInput,
    );
    res.status(200).json(reporte);
  } catch (err) {
    next(err);
  }
}

export async function eliminarReporteGuardado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as IdParam;
    const reporte = await reportesService.eliminarGuardado(id);
    res.status(200).json(reporte);
  } catch (err) {
    next(err);
  }
}

export async function getResumen(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resumen = await reportesService.resumen();
    res.status(200).json(resumen);
  } catch (err) {
    next(err);
  }
}

export async function getParametros(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ParametrosQuery;
    const resultado = await reportesService.parametros(query);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function getCertificadosPorCliente(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as CertificadosPorClienteQuery;
    const resultado = await reportesService.certificadosPorCliente(query);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function getDesviaciones(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as DesviacionesQuery;
    const resultado = await reportesService.desviaciones(query);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function getFicticias(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as FicticiasQuery;
    const resultado = await reportesService.ficticias(query);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function exportReporte(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ExportQuery;
    const csv = await reportesService.exportCsv(query);
    const filename = `reporte-${query.tipo}-${Date.now()}.csv`;
    res
      .status(200)
      .setHeader("Content-Type", "text/csv; charset=utf-8")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      )
      .send(csv);
  } catch (err) {
    next(err);
  }
}
