import {
  Prisma,
  type Cliente,
  type PrismaClient,
  type ValorReferenciaCliente,
} from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import {
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from "../../domain/errors.js";
import {
  buildPaginationResponse,
  parsePaginationQuery,
  type PaginationResponse,
} from "../../lib/pagination.js";
import { buildTextSearch } from "../../lib/filters.js";
import { auditLog, type PrismaLike } from "../../lib/audit.js";
import type {
  ActualizarClienteInput,
  ActualizarValorReferenciaInput,
  AgregarValorReferenciaInput,
  CrearClienteInput,
  ListClientesQuery,
} from "./clientes.schemas.js";

function translateTriggerError(err: unknown): never {
  const message =
    err instanceof Error && typeof err.message === "string" ? err.message : "";
  if (/límite|limite/i.test(message)) {
    throw new UnprocessableEntityError(
      "El rango definido está fuera del rango internacional del parámetro",
      { codigo: "VALOR_REFERENCIA_FUERA_DE_RANGO", origen: message.slice(0, 300) },
    );
  }
  throw err;
}

async function crearValorReferencia(
  db: PrismaLike,
  clienteId: bigint,
  input: AgregarValorReferenciaInput,
): Promise<ValorReferenciaCliente> {
  try {
    return await db.valorReferenciaCliente.create({
      data: {
        clienteId,
        parametroId: input.parametroId,
        limiteInferior: new Prisma.Decimal(input.limiteInferior),
        limiteSuperior: new Prisma.Decimal(input.limiteSuperior),
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ConflictError(
        "Ya existe un valor de referencia para ese parámetro en el cliente",
        { codigo: "VALOR_REFERENCIA_DUPLICADO" },
      );
    }
    // Los triggers de PostgreSQL emergen como PrismaClientUnknownRequestError
    // o PrismaClientKnownRequestError con el mensaje original de PG embebido.
    if (
      err instanceof Prisma.PrismaClientUnknownRequestError ||
      err instanceof Prisma.PrismaClientKnownRequestError
    ) {
      translateTriggerError(err);
    }
    throw err;
  }
}

export class ClientesService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async list(query: ListClientesQuery): Promise<PaginationResponse<Cliente>> {
    const { page, limit, skip, take } = parsePaginationQuery(query);

    const where: Prisma.ClienteWhereInput = {};
    if (query.estado !== "TODOS") where.estado = query.estado;
    const textSearch = buildTextSearch(query.q, ["claveSap", "nombre", "rfc"]);
    if (textSearch) Object.assign(where, textSearch);

    const [data, total] = await this.db.$transaction([
      this.db.cliente.findMany({
        where,
        skip,
        take,
        orderBy: { creadoEn: "desc" },
      }),
      this.db.cliente.count({ where }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async getById(id: bigint) {
    const cliente = await this.db.cliente.findUnique({
      where: { id },
      include: {
        valoresReferencia: {
          include: {
            parametro: {
              select: {
                id: true,
                clave: true,
                nombre: true,
                unidadMedida: true,
                limiteInferior: true,
                limiteSuperior: true,
              },
            },
          },
          orderBy: { creadoEn: "asc" },
        },
        _count: { select: { certificados: true } },
      },
    });
    if (!cliente) throw new NotFoundError("Cliente no encontrado");
    return cliente;
  }

  async crear(input: CrearClienteInput, usuarioId: bigint): Promise<Cliente> {
    if (!input.contactoCorreo) {
      throw new UnprocessableEntityError(
        "El correo de contacto es obligatorio para emitir certificados",
        { codigo: "CONTACTO_CORREO_REQUERIDO" },
      );
    }

    return this.db.$transaction(async (tx) => {
      const duplicado = await tx.cliente.findUnique({
        where: { claveSap: input.claveSap },
      });
      if (duplicado) {
        throw new ConflictError("Ya existe un cliente con esa clave SAP", {
          codigo: "CLIENTE_CLAVE_DUPLICADA",
        });
      }

      const creado = await tx.cliente.create({
        data: {
          claveSap: input.claveSap,
          nombre: input.nombre,
          rfc: input.rfc,
          domicilio: input.domicilio ?? null,
          contactoNombre: input.contactoNombre ?? null,
          contactoCorreo: input.contactoCorreo ?? null,
          contactoTelefono: input.contactoTelefono ?? null,
          creadoPor: usuarioId,
          actualizadoPor: usuarioId,
        },
      });

      if (input.valoresReferencia && input.valoresReferencia.length > 0) {
        for (const vr of input.valoresReferencia) {
          await crearValorReferencia(tx, creado.id, vr);
        }
      }

      await auditLog(tx, {
        usuarioId,
        entidad: "Cliente",
        entidadId: creado.id,
        accion: "CREAR",
        detalle: {
          claveSap: creado.claveSap,
          valoresReferencia: input.valoresReferencia?.length ?? 0,
        },
      });

      return creado;
    });
  }

  async actualizar(
    id: bigint,
    input: ActualizarClienteInput,
    usuarioId: bigint,
  ): Promise<Cliente> {
    return this.db.$transaction(async (tx) => {
      const cliente = await tx.cliente.findUnique({ where: { id } });
      if (!cliente) throw new NotFoundError("Cliente no encontrado");

      const correoResultante =
        input.contactoCorreo !== undefined
          ? input.contactoCorreo
          : cliente.contactoCorreo;

      if (!correoResultante) {
        throw new UnprocessableEntityError(
          "El correo de contacto es obligatorio para emitir certificados",
          { codigo: "CONTACTO_CORREO_REQUERIDO" },
        );
      }

      const data: Prisma.ClienteUpdateInput = {
        usuarioActualizador: { connect: { id: usuarioId } },
      };
      if (input.nombre !== undefined) data.nombre = input.nombre;
      if (input.rfc !== undefined) data.rfc = input.rfc;
      if (input.domicilio !== undefined) data.domicilio = input.domicilio;
      if (input.contactoNombre !== undefined)
        data.contactoNombre = input.contactoNombre;
      if (input.contactoCorreo !== undefined)
        data.contactoCorreo = input.contactoCorreo;
      if (input.contactoTelefono !== undefined)
        data.contactoTelefono = input.contactoTelefono;

      const actualizado = await tx.cliente.update({ where: { id }, data });

      await auditLog(tx, {
        usuarioId,
        entidad: "Cliente",
        entidadId: id,
        accion: "ACTUALIZAR",
        detalle: { campos: Object.keys(input) },
      });

      return actualizado;
    });
  }

  async agregarValorReferencia(
    clienteId: bigint,
    input: AgregarValorReferenciaInput,
    usuarioId: bigint,
  ): Promise<ValorReferenciaCliente> {
    return this.db.$transaction(async (tx) => {
      const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
      if (!cliente) throw new NotFoundError("Cliente no encontrado");

      const parametro = await tx.parametro.findUnique({
        where: { id: input.parametroId },
      });
      if (!parametro) throw new NotFoundError("Parámetro no encontrado");

      const creado = await crearValorReferencia(tx, clienteId, input);

      await auditLog(tx, {
        usuarioId,
        entidad: "ValorReferenciaCliente",
        entidadId: creado.id,
        accion: "CREAR",
        detalle: {
          clienteId: clienteId.toString(),
          parametroId: input.parametroId.toString(),
        },
      });

      return creado;
    });
  }

  async actualizarValorReferencia(
    clienteId: bigint,
    vrId: bigint,
    input: ActualizarValorReferenciaInput,
    usuarioId: bigint,
  ): Promise<ValorReferenciaCliente> {
    return this.db.$transaction(async (tx) => {
      const vr = await tx.valorReferenciaCliente.findUnique({ where: { id: vrId } });
      if (!vr || vr.clienteId !== clienteId) {
        throw new NotFoundError("Valor de referencia no encontrado");
      }

      let actualizado: ValorReferenciaCliente;
      try {
        actualizado = await tx.valorReferenciaCliente.update({
          where: { id: vrId },
          data: {
            limiteInferior: new Prisma.Decimal(input.limiteInferior),
            limiteSuperior: new Prisma.Decimal(input.limiteSuperior),
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientUnknownRequestError ||
          err instanceof Prisma.PrismaClientKnownRequestError
        ) {
          translateTriggerError(err);
        }
        throw err;
      }

      await auditLog(tx, {
        usuarioId,
        entidad: "ValorReferenciaCliente",
        entidadId: vrId,
        accion: "ACTUALIZAR",
        detalle: { clienteId: clienteId.toString() },
      });

      return actualizado;
    });
  }

  async eliminarValorReferencia(
    clienteId: bigint,
    vrId: bigint,
    usuarioId: bigint,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const vr = await tx.valorReferenciaCliente.findUnique({ where: { id: vrId } });
      if (!vr || vr.clienteId !== clienteId) {
        throw new NotFoundError("Valor de referencia no encontrado");
      }

      await tx.valorReferenciaCliente.delete({ where: { id: vrId } });

      await auditLog(tx, {
        usuarioId,
        entidad: "ValorReferenciaCliente",
        entidadId: vrId,
        accion: "ELIMINAR",
        detalle: {
          clienteId: clienteId.toString(),
          parametroId: vr.parametroId.toString(),
        },
      });
    });
  }

  async inactivar(id: bigint, motivo: string, usuarioId: bigint): Promise<Cliente> {
    return this.db.$transaction(async (tx) => {
      const cliente = await tx.cliente.findUnique({ where: { id } });
      if (!cliente) throw new NotFoundError("Cliente no encontrado");
      if (cliente.estado === "INACTIVO") {
        throw new ConflictError("El cliente ya se encuentra inactivo", {
          codigo: "CLIENTE_YA_INACTIVO",
        });
      }

      const enviosPendientes = await tx.envioCertificado.count({
        where: {
          estado: { in: ["PENDIENTE", "FALLIDO"] },
          certificado: { clienteId: id },
        },
      });

      const actualizado = await tx.cliente.update({
        where: { id },
        data: {
          estado: "INACTIVO",
          motivoInactivacion: motivo,
          usuarioActualizador: { connect: { id: usuarioId } },
        },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "Cliente",
        entidadId: id,
        accion: "INACTIVAR",
        detalle: { motivo, enviosPendientes },
      });

      return actualizado;
    });
  }

  async reactivar(id: bigint, usuarioId: bigint): Promise<Cliente> {
    return this.db.$transaction(async (tx) => {
      const cliente = await tx.cliente.findUnique({ where: { id } });
      if (!cliente) throw new NotFoundError("Cliente no encontrado");
      if (cliente.estado === "ACTIVO") {
        throw new ConflictError("El cliente ya se encuentra activo", {
          codigo: "CLIENTE_YA_ACTIVO",
        });
      }

      const actualizado = await tx.cliente.update({
        where: { id },
        data: {
          estado: "ACTIVO",
          motivoInactivacion: null,
          usuarioActualizador: { connect: { id: usuarioId } },
        },
      });

      await auditLog(tx, {
        usuarioId,
        entidad: "Cliente",
        entidadId: id,
        accion: "REACTIVAR",
      });

      return actualizado;
    });
  }
}

export const clientesService = new ClientesService();
