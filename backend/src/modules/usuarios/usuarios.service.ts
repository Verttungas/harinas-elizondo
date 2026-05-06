import bcrypt from "bcrypt";
import type { PrismaClient, RolUsuario } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import { ConflictError, NotFoundError } from "../../domain/errors.js";
import {
  buildPaginationResponse,
  parsePaginationQuery,
  type PaginationResponse,
} from "../../lib/pagination.js";
import type {
  ActualizarUsuarioInput,
  CrearUsuarioInput,
  ListUsuariosQuery,
} from "./usuarios.schemas.js";

type AppRole = RolUsuario | "ADMINISTRADOR";

export interface UsuarioAdmin {
  id: bigint;
  correo: string;
  nombre: string;
  rol: AppRole;
  activo: boolean;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

const usuarioSelect = {
  id: true,
  correo: true,
  nombre: true,
  rol: true,
  activo: true,
  intentosFallidos: true,
  bloqueadoHasta: true,
  creadoEn: true,
  actualizadoEn: true,
} as const;

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export class UsuariosService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async list(query: ListUsuariosQuery): Promise<PaginationResponse<UsuarioAdmin>> {
    const { page, limit, skip, take } = parsePaginationQuery(query);
    const where = {
      ...(query.estado !== "TODOS" ? { activo: query.estado === "ACTIVO" } : {}),
      ...(query.rol !== "TODOS" ? { rol: query.rol as RolUsuario } : {}),
      ...(query.q
        ? {
            OR: [
              { correo: { contains: query.q, mode: "insensitive" as const } },
              { nombre: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.usuario.findMany({
        where,
        select: usuarioSelect,
        orderBy: [{ activo: "desc" }, { nombre: "asc" }],
        skip,
        take,
      }),
      this.db.usuario.count({ where }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async getById(id: bigint): Promise<UsuarioAdmin> {
    const usuario = await this.db.usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    });
    if (!usuario) {
      throw new NotFoundError("Usuario no encontrado");
    }
    return usuario;
  }

  async crear(input: CrearUsuarioInput, adminId: bigint): Promise<UsuarioAdmin> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      return await this.db.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            correo: input.correo,
            passwordHash,
            nombre: input.nombre,
            rol: input.rol as RolUsuario,
            activo: input.activo,
          },
          select: usuarioSelect,
        });
        await tx.bitacora.create({
          data: {
            usuarioId: adminId,
            entidad: "Usuario",
            entidadId: usuario.id,
            accion: "CREAR_USUARIO",
            detalle: { correo: usuario.correo, rol: usuario.rol },
          },
        });
        return usuario;
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictError("Ya existe un usuario con ese correo");
      }
      throw err;
    }
  }

  async actualizar(
    id: bigint,
    input: ActualizarUsuarioInput,
    adminId: bigint,
  ): Promise<UsuarioAdmin> {
    await this.getById(id);
    if (id === adminId && input.activo === false) {
      throw new ConflictError("No puedes desactivar tu propio usuario");
    }

    const data = {
      ...(input.correo !== undefined ? { correo: input.correo } : {}),
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.rol !== undefined ? { rol: input.rol as RolUsuario } : {}),
      ...(input.activo !== undefined ? { activo: input.activo } : {}),
      ...(input.password !== undefined
        ? {
            passwordHash: await bcrypt.hash(input.password, 10),
            intentosFallidos: 0,
            bloqueadoHasta: null,
          }
        : {}),
    };

    try {
      return await this.db.$transaction(async (tx) => {
        const usuario = await tx.usuario.update({
          where: { id },
          data,
          select: usuarioSelect,
        });
        await tx.bitacora.create({
          data: {
            usuarioId: adminId,
            entidad: "Usuario",
            entidadId: usuario.id,
            accion: "ACTUALIZAR_USUARIO",
            detalle: { campos: Object.keys(input) },
          },
        });
        return usuario;
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictError("Ya existe un usuario con ese correo");
      }
      throw err;
    }
  }

  async eliminar(id: bigint, adminId: bigint): Promise<UsuarioAdmin> {
    if (id === adminId) {
      throw new ConflictError("No puedes eliminar tu propio usuario");
    }
    await this.getById(id);

    return this.db.$transaction(async (tx) => {
      const usuario = await tx.usuario.update({
        where: { id },
        data: {
          activo: false,
          intentosFallidos: 0,
          bloqueadoHasta: null,
        },
        select: usuarioSelect,
      });
      await tx.bitacora.create({
        data: {
          usuarioId: adminId,
          entidad: "Usuario",
          entidadId: usuario.id,
          accion: "ELIMINAR_USUARIO",
          detalle: { correo: usuario.correo },
        },
      });
      return usuario;
    });
  }
}

export const usuariosService = new UsuariosService();
