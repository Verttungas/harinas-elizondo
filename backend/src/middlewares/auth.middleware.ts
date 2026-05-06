import type { NextFunction, Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { RolUsuario, Usuario } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, UnauthorizedError } from "../domain/errors.js";

type AppRole = RolUsuario | "ADMINISTRADOR";

export interface AuthenticatedUser {
  id: bigint;
  correo: string;
  rol: AppRole;
  nombre: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

interface JwtPayload {
  sub: string;
  rol: AppRole;
}

export function generateToken(usuario: Usuario): string {
  const payload: JwtPayload = {
    sub: usuario.id.toString(),
    rol: usuario.rol,
  };
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      throw new UnauthorizedError("Token de autenticación requerido");
    }
    const token = header.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError("Token de autenticación requerido");
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError("Token inválido o expirado");
    }

    if (!payload.sub) {
      throw new UnauthorizedError("Token inválido o expirado");
    }

    let userId: bigint;
    try {
      userId = BigInt(payload.sub);
    } catch {
      throw new UnauthorizedError("Token inválido o expirado");
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, correo: true, rol: true, nombre: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedError("Usuario no autorizado");
    }

    (req as AuthenticatedRequest).user = {
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      next(new UnauthorizedError());
      return;
    }
    if (user.rol === "ADMINISTRADOR") {
      next();
      return;
    }
    if (!roles.includes(user.rol)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
