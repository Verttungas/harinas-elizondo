import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { DomainError } from "../domain/errors.js";
import { logger } from "../lib/logger.js";

type ErrorBody = {
  error: {
    codigo: string;
    mensaje: string;
    detalles?: unknown;
  };
};

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof DomainError) {
    const body: ErrorBody = {
      error: {
        codigo: err.code,
        mensaje: err.message,
        ...(err.details !== undefined ? { detalles: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const detalles = err.errors.map((issue) => ({
      campo: issue.path.join("."),
      razon: issue.message,
    }));
    res.status(400).json({
      error: {
        codigo: "VALIDATION_ERROR",
        mensaje: "Datos de entrada inválidos",
        detalles,
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        error: {
          codigo: "DUPLICATE",
          mensaje: "Ya existe un registro con los mismos datos únicos",
          detalles: { target: err.meta?.target },
        },
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        error: {
          codigo: "NOT_FOUND",
          mensaje: "Recurso no encontrado",
        },
      });
      return;
    }
  }

  logger.error(
    { err: err instanceof Error ? { message: err.message, stack: err.stack } : err },
    "unhandled error in request pipeline",
  );

  res.status(500).json({
    error: {
      codigo: "INTERNAL_ERROR",
      mensaje: "Error interno del servidor",
    },
  });
}
