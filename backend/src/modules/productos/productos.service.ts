import { Prisma, type PrismaClient, type Producto } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import { ConflictError } from "../../domain/errors.js";
import {
  buildPaginationResponse,
  parsePaginationQuery,
  type PaginationResponse,
} from "../../lib/pagination.js";
import { buildTextSearch } from "../../lib/filters.js";
import { auditLog } from "../../lib/audit.js";
import type { CrearProductoInput, ListProductosQuery } from "./productos.schemas.js";

export class ProductosService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async list(query: ListProductosQuery): Promise<PaginationResponse<Producto>> {
    const { page, limit, skip, take } = parsePaginationQuery(query);
    const where: Prisma.ProductoWhereInput = {
      ...(buildTextSearch(query.q, ["clave", "nombre"]) ?? {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.producto.findMany({
        where,
        skip,
        take,
        orderBy: { creadoEn: "desc" },
      }),
      this.db.producto.count({ where }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async crear(input: CrearProductoInput, usuarioId: bigint): Promise<Producto> {
    return this.db.$transaction(async (tx) => {
      const existente = await tx.producto.findUnique({ where: { clave: input.clave } });
      if (existente) {
        throw new ConflictError("Ya existe un producto con esa clave", {
          codigo: "PRODUCTO_CLAVE_DUPLICADA",
        });
      }

      const creado = await tx.producto.create({
        data: {
          clave: input.clave,
          nombre: input.nombre,
          descripcion: input.descripcion ?? null,
        },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "Producto",
        entidadId: creado.id,
        accion: "CREAR",
        detalle: { clave: creado.clave, nombre: creado.nombre },
      });

      return creado;
    });
  }
}

export const productosService = new ProductosService();
