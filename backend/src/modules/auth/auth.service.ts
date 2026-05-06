import bcrypt from "bcrypt";
import type { PrismaClient, RolUsuario } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import { generateToken } from "../../middlewares/auth.middleware.js";
import {
  AccountLockedError,
  InvalidCredentialsError,
  NotFoundError,
  UnauthorizedError,
} from "../../domain/errors.js";
import { logger } from "../../lib/logger.js";
import type { LoginInput } from "./auth.schemas.js";

type AppRole = RolUsuario | "ADMINISTRADOR";

export interface UsuarioPublico {
  id: bigint;
  correo: string;
  nombre: string;
  rol: AppRole;
}

export interface LoginContext {
  ip?: string;
}

export interface LoginResult {
  token: string;
  usuario: UsuarioPublico;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export class AuthService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async login(input: LoginInput, context: LoginContext = {}): Promise<LoginResult> {
    const usuario = await this.db.usuario.findUnique({
      where: { correo: input.correo },
    });

    if (!usuario) {
      logger.info({ correo: input.correo }, "login failed: user not found");
      throw new InvalidCredentialsError();
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta.getTime() > Date.now()) {
      throw new AccountLockedError();
    }

    if (!usuario.activo) {
      throw new UnauthorizedError("Usuario no autorizado");
    }

    const passwordOk = await bcrypt.compare(input.password, usuario.passwordHash);

    if (!passwordOk) {
      const nextFailed = usuario.intentosFallidos + 1;
      const shouldLock = nextFailed >= MAX_FAILED_ATTEMPTS;
      const lockUntil = shouldLock
        ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
        : null;

      await this.db.$transaction([
        this.db.usuario.update({
          where: { id: usuario.id },
          data: {
            intentosFallidos: shouldLock ? 0 : nextFailed,
            bloqueadoHasta: lockUntil,
          },
        }),
        this.db.bitacora.create({
          data: {
            usuarioId: usuario.id,
            entidad: "Usuario",
            entidadId: usuario.id,
            accion: "LOGIN_FALLIDO",
            detalle: {
              correo: input.correo,
              ip: context.ip ?? null,
              intentos: nextFailed,
              bloqueado: shouldLock,
            },
          },
        }),
      ]);

      logger.info(
        { usuarioId: usuario.id.toString(), intentos: nextFailed, locked: shouldLock },
        "login failed: invalid password",
      );

      if (shouldLock) {
        throw new AccountLockedError();
      }
      throw new InvalidCredentialsError();
    }

    await this.db.$transaction([
      this.db.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: 0,
          bloqueadoHasta: null,
        },
      }),
      this.db.bitacora.create({
        data: {
          usuarioId: usuario.id,
          entidad: "Usuario",
          entidadId: usuario.id,
          accion: "LOGIN_EXITOSO",
          detalle: {
            correo: input.correo,
            ip: context.ip ?? null,
          },
        },
      }),
    ]);

    const token = generateToken(usuario);

    logger.info({ usuarioId: usuario.id.toString() }, "login succeeded");

    return {
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
  }

  async getUserById(id: bigint): Promise<UsuarioPublico> {
    const usuario = await this.db.usuario.findUnique({
      where: { id },
      select: { id: true, correo: true, nombre: true, rol: true },
    });
    if (!usuario) {
      throw new NotFoundError("Usuario no encontrado");
    }
    return usuario;
  }

  async logLogout(usuarioId: bigint, correo: string, ip?: string): Promise<void> {
    await this.db.bitacora.create({
      data: {
        usuarioId,
        entidad: "Usuario",
        entidadId: usuarioId,
        accion: "LOGOUT",
        detalle: { correo, ip: ip ?? null },
      },
    });
  }
}

export const authService = new AuthService();
