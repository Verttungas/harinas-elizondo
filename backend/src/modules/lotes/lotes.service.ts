import { Prisma, type LoteProduccion, type PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import { ConflictError, NotFoundError } from "../../domain/errors.js";
import {
  buildPaginationResponse,
  parsePaginationQuery,
  type PaginationResponse,
} from "../../lib/pagination.js";
import { buildTextSearch } from "../../lib/filters.js";
import { auditLog } from "../../lib/audit.js";
import type { CrearLoteInput, ListLotesQuery } from "./lotes.schemas.js";

export class LotesService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async list(query: ListLotesQuery): Promise<PaginationResponse<LoteProduccion>> {
    const { page, limit, skip, take } = parsePaginationQuery(query);

    const where: Prisma.LoteProduccionWhereInput = {};
    if (query.productoId !== undefined) where.productoId = query.productoId;
    if (query.desde || query.hasta) {
      where.fechaProduccion = {};
      if (query.desde) where.fechaProduccion.gte = new Date(query.desde);
      if (query.hasta) where.fechaProduccion.lte = new Date(query.hasta);
    }
    const textSearch = buildTextSearch(query.q, ["numeroLote"]);
    if (textSearch) Object.assign(where, textSearch);

    const [data, total] = await this.db.$transaction([
      this.db.loteProduccion.findMany({
        where,
        skip,
        take,
        orderBy: { creadoEn: "desc" },
        include: { producto: true },
      }),
      this.db.loteProduccion.count({ where }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async getById(id: bigint) {
    const lote = await this.db.loteProduccion.findUnique({
      where: { id },
      include: {
        producto: true,
        inspecciones: {
          orderBy: { secuencia: "asc" },
        },
      },
    });
    if (!lote) {
      throw new NotFoundError("Lote no encontrado");
    }
    return lote;
  }

  async crear(input: CrearLoteInput, usuarioId: bigint): Promise<LoteProduccion> {
    return this.db.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({
        where: { id: input.productoId },
      });
      if (!producto) {
        throw new NotFoundError("Producto no encontrado");
      }

      const duplicado = await tx.loteProduccion.findUnique({
        where: { numeroLote: input.numeroLote },
      });
      if (duplicado) {
        throw new ConflictError("Ya existe un lote con ese número", {
          codigo: "LOTE_NUMERO_DUPLICADO",
        });
      }

      const creado = await tx.loteProduccion.create({
        data: {
          numeroLote: input.numeroLote,
          productoId: input.productoId,
          fechaProduccion: new Date(input.fechaProduccion),
          cantidadProducida:
            input.cantidadProducida !== undefined
              ? new Prisma.Decimal(input.cantidadProducida)
              : null,
          unidadCantidad: input.unidadCantidad ?? null,
          creadoPor: usuarioId,
        },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "LoteProduccion",
        entidadId: creado.id,
        accion: "CREAR",
        detalle: {
          numeroLote: creado.numeroLote,
          productoId: creado.productoId.toString(),
        },
      });

      return creado;
    });
  }
}

export const lotesService = new LotesService();
