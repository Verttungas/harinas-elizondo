import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../domain/errors.js";
import {
  buildPaginationResponse,
  parsePaginationQuery,
  type PaginationResponse,
} from "../../lib/pagination.js";
import { auditLog, type PrismaLike } from "../../lib/audit.js";
import type {
  ActualizarInspeccionInput,
  CrearFicticiaInput,
  CrearInspeccionInput,
  ListInspeccionesQuery,
  ResultadoInput,
} from "./inspecciones.schemas.js";

function isSequenceExhaustedError(err: unknown): boolean {
  const message =
    err instanceof Error && typeof err.message === "string" ? err.message : "";
  return /secuencia máxima|secuencia maxima|alcanzó la secuencia/i.test(message);
}

async function validarResultadosContraParametros(
  db: PrismaLike,
  resultados: ResultadoInput[],
): Promise<void> {
  const ids = resultados.map((r) => r.parametroId);
  const dedup = new Set(ids.map((id) => id.toString()));
  if (dedup.size !== ids.length) {
    throw new ValidationError(
      "No se permiten parámetros duplicados en los resultados",
      { codigo: "RESULTADOS_PARAMETROS_DUPLICADOS" },
    );
  }

  const parametros = await db.parametro.findMany({
    where: { id: { in: ids } },
    select: { id: true, activo: true },
  });

  if (parametros.length !== ids.length) {
    throw new ValidationError(
      "Uno o más parámetros no existen",
      { codigo: "PARAMETRO_NO_EXISTE" },
    );
  }

  const inactivos = parametros.filter((p) => !p.activo);
  if (inactivos.length > 0) {
    throw new ValidationError(
      "Uno o más parámetros están inactivos",
      {
        codigo: "PARAMETRO_INACTIVO",
        parametroIds: inactivos.map((p) => p.id.toString()),
      },
    );
  }
}

async function insertarResultados(
  db: PrismaLike,
  inspeccionId: bigint,
  resultados: ResultadoInput[],
): Promise<void> {
  // Insertar uno por uno para que el trigger BEFORE INSERT calcule desviación y dentro_especificacion.
  // createMany no ejecuta los triggers row-level de la misma manera si Prisma usa COPY; preferimos create seguro.
  for (const r of resultados) {
    await db.resultadoInspeccion.create({
      data: {
        inspeccionId,
        parametroId: r.parametroId,
        valor: new Prisma.Decimal(r.valor),
        dentroEspecificacion: false,
      },
    });
  }
}

export class InspeccionesService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async list(
    query: ListInspeccionesQuery,
  ): Promise<PaginationResponse<unknown>> {
    const { page, limit, skip, take } = parsePaginationQuery(query);

    const where: Prisma.InspeccionWhereInput = {};
    if (query.loteId !== undefined) where.loteId = query.loteId;
    if (query.estado !== "TODOS") where.estado = query.estado;
    if (query.esFicticia !== undefined) where.esFicticia = query.esFicticia;
    if (query.desde || query.hasta) {
      where.fechaInspeccion = {};
      if (query.desde) where.fechaInspeccion.gte = new Date(query.desde);
      if (query.hasta) where.fechaInspeccion.lte = new Date(query.hasta);
    }

    const [data, total] = await this.db.$transaction([
      this.db.inspeccion.findMany({
        where,
        skip,
        take,
        orderBy: { fechaInspeccion: "desc" },
        include: {
          lote: { select: { id: true, numeroLote: true, productoId: true } },
          _count: { select: { resultados: true } },
        },
      }),
      this.db.inspeccion.count({ where }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async getById(id: bigint) {
    const inspeccion = await this.db.inspeccion.findUnique({
      where: { id },
      include: {
        lote: { include: { producto: true } },
        resultados: {
          include: {
            parametro: { include: { equipo: true } },
          },
        },
        inspeccionOrigen: {
          select: { id: true, secuencia: true, esFicticia: true },
        },
      },
    });
    if (!inspeccion) throw new NotFoundError("Inspección no encontrada");
    return inspeccion;
  }

  async crearEnLote(
    loteId: bigint,
    input: CrearInspeccionInput,
    usuarioId: bigint,
  ) {
    const lote = await this.db.loteProduccion.findUnique({
      where: { id: loteId },
      select: { id: true },
    });
    if (!lote) throw new NotFoundError("Lote no encontrado");

    await validarResultadosContraParametros(this.db, input.resultados);

    try {
      return await this.db.$transaction(async (tx) => {
        const inspeccion = await tx.inspeccion.create({
          data: {
            loteId,
            secuencia: "",
            fechaInspeccion: new Date(input.fechaInspeccion),
            estado: input.guardarComoBorrador ? "BORRADOR" : "CERRADA",
            observaciones: input.observaciones ?? null,
            creadoPor: usuarioId,
          },
        });

        await insertarResultados(tx, inspeccion.id, input.resultados);

        await auditLog(tx, {
          usuarioId,
          entidad: "Inspeccion",
          entidadId: inspeccion.id,
          accion: "CREAR",
          detalle: {
            loteId: loteId.toString(),
            secuencia: inspeccion.secuencia,
            esFicticia: false,
            estado: inspeccion.estado,
          },
        });

        return tx.inspeccion.findUnique({
          where: { id: inspeccion.id },
          include: {
            lote: { include: { producto: true } },
            resultados: { include: { parametro: true } },
          },
        });
      });
    } catch (err) {
      if (isSequenceExhaustedError(err)) {
        throw new ConflictError(
          "El lote ya alcanzó la secuencia máxima Z (26 inspecciones)",
          { codigo: "LOTE_SECUENCIA_AGOTADA" },
        );
      }
      throw err;
    }
  }

  async actualizar(
    id: bigint,
    input: ActualizarInspeccionInput,
    usuarioId: bigint,
  ) {
    const existente = await this.db.inspeccion.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });
    if (!existente) throw new NotFoundError("Inspección no encontrada");
    if (existente.estado === "CERRADA") {
      throw new ConflictError(
        "No se puede editar una inspección cerrada",
        { codigo: "INSPECCION_CERRADA_INMUTABLE" },
      );
    }

    if (input.resultados) {
      await validarResultadosContraParametros(this.db, input.resultados);
    }

    return this.db.$transaction(async (tx) => {
      const data: Prisma.InspeccionUpdateInput = {};
      if (input.fechaInspeccion !== undefined)
        data.fechaInspeccion = new Date(input.fechaInspeccion);
      if (input.observaciones !== undefined)
        data.observaciones = input.observaciones;
      if (input.guardarComoBorrador === false) data.estado = "CERRADA";

      await tx.inspeccion.update({ where: { id }, data });

      if (input.resultados) {
        await tx.resultadoInspeccion.deleteMany({
          where: { inspeccionId: id },
        });
        await insertarResultados(tx, id, input.resultados);
      }

      await auditLog(tx, {
        usuarioId,
        entidad: "Inspeccion",
        entidadId: id,
        accion: "ACTUALIZAR",
        detalle: {
          campos: Object.keys(input),
          resultadosActualizados: input.resultados ? input.resultados.length : 0,
        },
      });

      return tx.inspeccion.findUnique({
        where: { id },
        include: {
          lote: { include: { producto: true } },
          resultados: { include: { parametro: true } },
        },
      });
    });
  }

  async cerrar(id: bigint, usuarioId: bigint) {
    const inspeccion = await this.db.inspeccion.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });
    if (!inspeccion) throw new NotFoundError("Inspección no encontrada");

    if (inspeccion.estado === "CERRADA") {
      return this.db.inspeccion.findUnique({
        where: { id },
        include: { resultados: true },
      });
    }

    return this.db.$transaction(async (tx) => {
      const actualizada = await tx.inspeccion.update({
        where: { id },
        data: { estado: "CERRADA" },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "Inspeccion",
        entidadId: id,
        accion: "CERRAR",
      });

      return actualizada;
    });
  }

  async crearFicticia(
    inspeccionOrigenId: bigint,
    input: CrearFicticiaInput,
    usuarioId: bigint,
  ) {
    const origen = await this.db.inspeccion.findUnique({
      where: { id: inspeccionOrigenId },
      include: {
        resultados: { select: { parametroId: true, valor: true } },
      },
    });
    if (!origen) throw new NotFoundError("Inspección origen no encontrada");
    if (origen.estado !== "CERRADA") {
      throw new ConflictError(
        "Solo se pueden derivar ficticias de inspecciones cerradas",
        { codigo: "INSPECCION_ORIGEN_NO_CERRADA" },
      );
    }

    await validarResultadosContraParametros(this.db, input.resultados);

    const mapaOrigen = new Map(
      origen.resultados.map((r) => [r.parametroId.toString(), r.valor.toString()]),
    );
    const algunaDiferencia = input.resultados.some((r) => {
      const original = mapaOrigen.get(r.parametroId.toString());
      if (original === undefined) return true;
      return new Prisma.Decimal(r.valor).toString() !== original;
    });
    if (!algunaDiferencia) {
      throw new ValidationError(
        "Los resultados de la ficticia deben diferir al menos en un valor respecto a la inspección origen",
        { codigo: "FICTICIA_RESULTADOS_IDENTICOS" },
      );
    }

    try {
      return await this.db.$transaction(async (tx) => {
        const ficticia = await tx.inspeccion.create({
          data: {
            loteId: origen.loteId,
            secuencia: "",
            fechaInspeccion: new Date(),
            estado: "CERRADA",
            esFicticia: true,
            inspeccionOrigenId: origen.id,
            justificacionAjuste: input.justificacion,
            creadoPor: usuarioId,
          },
        });

        await insertarResultados(tx, ficticia.id, input.resultados);

        await auditLog(tx, {
          usuarioId,
          entidad: "Inspeccion",
          entidadId: ficticia.id,
          accion: "CREAR_FICTICIA",
          detalle: {
            inspeccionOrigenId: origen.id.toString(),
            justificacion: input.justificacion,
          },
        });

        return tx.inspeccion.findUnique({
          where: { id: ficticia.id },
          include: {
            lote: { include: { producto: true } },
            resultados: { include: { parametro: true } },
            inspeccionOrigen: {
              select: { id: true, secuencia: true },
            },
          },
        });
      });
    } catch (err) {
      if (isSequenceExhaustedError(err)) {
        throw new ConflictError(
          "El lote ya alcanzó la secuencia máxima Z (26 inspecciones)",
          { codigo: "LOTE_SECUENCIA_AGOTADA" },
        );
      }
      throw err;
    }
  }
}

export const inspeccionesService = new InspeccionesService();
