import {
  Prisma,
  type EquipoLaboratorio,
  type Parametro,
  type PrismaClient,
} from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import { ConflictError, NotFoundError } from "../../domain/errors.js";
import {
  buildPaginationResponse,
  parsePaginationQuery,
  type PaginationResponse,
} from "../../lib/pagination.js";
import { buildTextSearch } from "../../lib/filters.js";
import { auditLog } from "../../lib/audit.js";
import type {
  ActualizarEquipoInput,
  ActualizarParametroInput,
  CrearEquipoInput,
  CrearParametroInput,
  ListEquiposQuery,
} from "./equipos.schemas.js";

function toDecimal(n: number | undefined | null): Prisma.Decimal | null | undefined {
  if (n === undefined) return undefined;
  if (n === null) return null;
  return new Prisma.Decimal(n);
}

function toDate(v: string | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  return new Date(v);
}

export class EquiposService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async list(
    query: ListEquiposQuery,
  ): Promise<PaginationResponse<EquipoLaboratorio>> {
    const { page, limit, skip, take } = parsePaginationQuery(query);

    const where: Prisma.EquipoLaboratorioWhereInput = {};
    if (query.estado !== "TODOS") where.estado = query.estado;
    if (query.marca) where.marca = query.marca;
    const textSearch = buildTextSearch(query.q, ["clave", "descripcionCorta"]);
    if (textSearch) Object.assign(where, textSearch);

    const [data, total] = await this.db.$transaction([
      this.db.equipoLaboratorio.findMany({
        where,
        skip,
        take,
        orderBy: { creadoEn: "desc" },
      }),
      this.db.equipoLaboratorio.count({ where }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async getById(id: bigint) {
    const equipo = await this.db.equipoLaboratorio.findUnique({
      where: { id },
      include: {
        parametros: {
          where: { activo: true },
          orderBy: { clave: "asc" },
        },
      },
    });
    if (!equipo) {
      throw new NotFoundError("Equipo no encontrado");
    }
    return equipo;
  }

  async crear(input: CrearEquipoInput, usuarioId: bigint) {
    return this.db.$transaction(async (tx) => {
      const duplicado = await tx.equipoLaboratorio.findUnique({
        where: { clave: input.clave },
      });
      if (duplicado) {
        throw new ConflictError("Ya existe un equipo con esa clave", {
          codigo: "EQUIPO_CLAVE_DUPLICADA",
        });
      }

      const creado = await tx.equipoLaboratorio.create({
        data: {
          clave: input.clave,
          descripcionCorta: input.descripcionCorta,
          descripcionLarga: input.descripcionLarga ?? null,
          marca: input.marca ?? null,
          modelo: input.modelo ?? null,
          serie: input.serie ?? null,
          proveedor: input.proveedor ?? null,
          fechaAdquisicion: input.fechaAdquisicion
            ? new Date(input.fechaAdquisicion)
            : null,
          vigenciaGarantia: input.vigenciaGarantia
            ? new Date(input.vigenciaGarantia)
            : null,
          ubicacion: input.ubicacion ?? null,
          responsable: input.responsable ?? null,
          creadoPor: usuarioId,
          actualizadoPor: usuarioId,
          parametros: {
            create: input.parametros.map((p) => ({
              clave: p.clave,
              nombre: p.nombre,
              unidadMedida: p.unidadMedida,
              desviacionAceptable:
                p.desviacionAceptable !== undefined
                  ? new Prisma.Decimal(p.desviacionAceptable)
                  : null,
              limiteInferior: new Prisma.Decimal(p.limiteInferior),
              limiteSuperior: new Prisma.Decimal(p.limiteSuperior),
            })),
          },
        },
        include: { parametros: true },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "EquipoLaboratorio",
        entidadId: creado.id,
        accion: "CREAR",
        detalle: {
          clave: creado.clave,
          parametros: creado.parametros.length,
        },
      });

      return creado;
    });
  }

  async actualizar(id: bigint, input: ActualizarEquipoInput, usuarioId: bigint) {
    return this.db.$transaction(async (tx) => {
      const equipo = await tx.equipoLaboratorio.findUnique({ where: { id } });
      if (!equipo) throw new NotFoundError("Equipo no encontrado");

      const data: Prisma.EquipoLaboratorioUpdateInput = {
        usuarioActualizador: { connect: { id: usuarioId } },
      };
      if (input.descripcionCorta !== undefined)
        data.descripcionCorta = input.descripcionCorta;
      if (input.descripcionLarga !== undefined)
        data.descripcionLarga = input.descripcionLarga;
      if (input.marca !== undefined) data.marca = input.marca;
      if (input.modelo !== undefined) data.modelo = input.modelo;
      if (input.serie !== undefined) data.serie = input.serie;
      if (input.proveedor !== undefined) data.proveedor = input.proveedor;
      if (input.fechaAdquisicion !== undefined)
        data.fechaAdquisicion = toDate(input.fechaAdquisicion);
      if (input.vigenciaGarantia !== undefined)
        data.vigenciaGarantia = toDate(input.vigenciaGarantia);
      if (input.ubicacion !== undefined) data.ubicacion = input.ubicacion;
      if (input.responsable !== undefined) data.responsable = input.responsable;

      const actualizado = await tx.equipoLaboratorio.update({
        where: { id },
        data,
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "EquipoLaboratorio",
        entidadId: id,
        accion: "ACTUALIZAR",
        detalle: { campos: Object.keys(input) },
      });

      return actualizado;
    });
  }

  async agregarParametro(
    equipoId: bigint,
    input: CrearParametroInput,
    usuarioId: bigint,
  ): Promise<Parametro> {
    return this.db.$transaction(async (tx) => {
      const equipo = await tx.equipoLaboratorio.findUnique({
        where: { id: equipoId },
      });
      if (!equipo) throw new NotFoundError("Equipo no encontrado");

      const duplicado = await tx.parametro.findUnique({
        where: { equipoId_clave: { equipoId, clave: input.clave } },
      });
      if (duplicado) {
        throw new ConflictError("Ya existe un parámetro con esa clave en el equipo", {
          codigo: "PARAMETRO_CLAVE_DUPLICADA",
        });
      }

      const creado = await tx.parametro.create({
        data: {
          equipoId,
          clave: input.clave,
          nombre: input.nombre,
          unidadMedida: input.unidadMedida,
          desviacionAceptable: toDecimal(input.desviacionAceptable) ?? null,
          limiteInferior: new Prisma.Decimal(input.limiteInferior),
          limiteSuperior: new Prisma.Decimal(input.limiteSuperior),
        },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "Parametro",
        entidadId: creado.id,
        accion: "CREAR",
        detalle: { equipoId: equipoId.toString(), clave: creado.clave },
      });

      return creado;
    });
  }

  async actualizarParametro(
    equipoId: bigint,
    parametroId: bigint,
    input: ActualizarParametroInput,
    usuarioId: bigint,
  ): Promise<Parametro> {
    return this.db.$transaction(async (tx) => {
      const parametro = await tx.parametro.findUnique({ where: { id: parametroId } });
      if (!parametro || parametro.equipoId !== equipoId) {
        throw new NotFoundError("Parámetro no encontrado");
      }

      const data: Prisma.ParametroUpdateInput = {};
      if (input.nombre !== undefined) data.nombre = input.nombre;
      if (input.unidadMedida !== undefined) data.unidadMedida = input.unidadMedida;
      if (input.desviacionAceptable !== undefined)
        data.desviacionAceptable = toDecimal(input.desviacionAceptable);
      if (input.limiteInferior !== undefined)
        data.limiteInferior = new Prisma.Decimal(input.limiteInferior);
      if (input.limiteSuperior !== undefined)
        data.limiteSuperior = new Prisma.Decimal(input.limiteSuperior);

      const actualizado = await tx.parametro.update({
        where: { id: parametroId },
        data,
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "Parametro",
        entidadId: parametroId,
        accion: "ACTUALIZAR",
        detalle: { equipoId: equipoId.toString(), campos: Object.keys(input) },
      });

      return actualizado;
    });
  }

  async inactivarParametro(
    equipoId: bigint,
    parametroId: bigint,
    usuarioId: bigint,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const parametro = await tx.parametro.findUnique({ where: { id: parametroId } });
      if (!parametro || parametro.equipoId !== equipoId) {
        throw new NotFoundError("Parámetro no encontrado");
      }

      const resultadosCount = await tx.resultadoInspeccion.count({
        where: { parametroId },
      });
      if (resultadosCount > 0) {
        throw new ConflictError(
          "No se puede eliminar un parámetro con resultados asociados; márquelo como inactivo.",
          { codigo: "PARAMETRO_CON_RESULTADOS" },
        );
      }

      await tx.parametro.update({
        where: { id: parametroId },
        data: { activo: false },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "Parametro",
        entidadId: parametroId,
        accion: "INACTIVAR",
        detalle: { equipoId: equipoId.toString(), clave: parametro.clave },
      });
    });
  }

  async inactivar(id: bigint, motivo: string, usuarioId: bigint) {
    return this.db.$transaction(async (tx) => {
      const equipo = await tx.equipoLaboratorio.findUnique({ where: { id } });
      if (!equipo) throw new NotFoundError("Equipo no encontrado");
      if (equipo.estado !== "ACTIVO") {
        throw new ConflictError(
          "Solo se pueden inactivar equipos en estado ACTIVO",
          { codigo: "EQUIPO_ESTADO_INVALIDO", estadoActual: equipo.estado },
        );
      }

      const actualizado = await tx.equipoLaboratorio.update({
        where: { id },
        data: {
          estado: "INACTIVO",
          motivoBaja: motivo,
          usuarioActualizador: { connect: { id: usuarioId } },
        },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "EquipoLaboratorio",
        entidadId: id,
        accion: "INACTIVAR",
        detalle: { motivo },
      });

      return actualizado;
    });
  }

  async darBaja(id: bigint, motivo: string, usuarioId: bigint) {
    return this.db.$transaction(async (tx) => {
      const equipo = await tx.equipoLaboratorio.findUnique({ where: { id } });
      if (!equipo) throw new NotFoundError("Equipo no encontrado");
      if (equipo.estado === "BAJA") {
        throw new ConflictError("El equipo ya se encuentra dado de baja", {
          codigo: "EQUIPO_YA_EN_BAJA",
        });
      }

      const actualizado = await tx.equipoLaboratorio.update({
        where: { id },
        data: {
          estado: "BAJA",
          motivoBaja: motivo,
          usuarioActualizador: { connect: { id: usuarioId } },
        },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "EquipoLaboratorio",
        entidadId: id,
        accion: "DAR_BAJA",
        detalle: { motivo, estadoAnterior: equipo.estado },
      });

      return actualizado;
    });
  }
}

export const equiposService = new EquiposService();
