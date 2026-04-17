import type { NextFunction, Request, Response } from "express";
import { reportesService } from "./reportes.service.js";
import type {
  CertificadosPorClienteQuery,
  DesviacionesQuery,
  ExportQuery,
  FicticiasQuery,
  ParametrosQuery,
} from "./reportes.schemas.js";

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
