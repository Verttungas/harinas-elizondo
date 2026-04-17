import type { Request, Response } from "express";

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      codigo: "NOT_FOUND",
      mensaje: "Recurso no encontrado",
    },
  });
}
