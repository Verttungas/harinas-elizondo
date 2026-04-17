import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { authService } from "./auth.service.js";
import type { LoginInput } from "./auth.schemas.js";

export async function postLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as LoginInput;
    const result = await authService.login(body, { ip: req.ip });
    res.status(200).json({ token: result.token, usuario: result.usuario });
  } catch (err) {
    next(err);
  }
}

export function getMe(req: Request, res: Response): void {
  const user = (req as AuthenticatedRequest).user;
  res.status(200).json({ usuario: user });
}

export async function postLogout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    await authService.logLogout(user.id, user.correo, req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
