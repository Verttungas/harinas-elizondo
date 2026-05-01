import { Prisma, type PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
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
import { auditLog } from "../../lib/audit.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { enviarCorreo } from "../../lib/mailer.js";
import { escapeHtml } from "../../lib/html.js";
import { generarNumeroCertificado } from "./certificados.numbering.js";
import { certificadoPdfService } from "./pdf.service.js";
import type {
  EmitirCertificadoInput,
  ListCertificadosQuery,
} from "./certificados.schemas.js";

const MAX_INTENTOS_ENVIO = 3;

export class CertificadosService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async list(
    query: ListCertificadosQuery,
  ): Promise<PaginationResponse<unknown>> {
    const { page, limit, skip, take } = parsePaginationQuery(query);

    const where: Prisma.CertificadoWhereInput = {};
    if (query.clienteId !== undefined) where.clienteId = query.clienteId;
    if (query.loteId !== undefined) where.loteId = query.loteId;
    if (query.estado !== "TODOS") where.estado = query.estado;
    if (query.desde || query.hasta) {
      where.fechaEmision = {};
      if (query.desde) where.fechaEmision.gte = new Date(query.desde);
      if (query.hasta) where.fechaEmision.lte = new Date(query.hasta);
    }
    const textSearch = buildTextSearch(query.q, ["numero"]);
    if (textSearch) Object.assign(where, textSearch);

    const [data, total] = await this.db.$transaction([
      this.db.certificado.findMany({
        where,
        skip,
        take,
        orderBy: { fechaEmision: "desc" },
        include: {
          cliente: { select: { id: true, claveSap: true, nombre: true } },
          lote: { select: { id: true, numeroLote: true } },
          _count: { select: { envios: true } },
        },
      }),
      this.db.certificado.count({ where }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async getById(id: bigint) {
    const certificado = await this.db.certificado.findUnique({
      where: { id },
      include: {
        cliente: true,
        lote: { include: { producto: true } },
        certificadoInspeccion: {
          include: {
            inspeccion: {
              include: {
                resultados: { include: { parametro: true } },
              },
            },
          },
          orderBy: { orden: "asc" },
        },
        envios: { orderBy: { creadoEn: "asc" } },
        usuarioCreador: {
          select: { id: true, nombre: true, correo: true },
        },
      },
    });
    if (!certificado) throw new NotFoundError("Certificado no encontrado");
    return certificado;
  }

  async emitir(input: EmitirCertificadoInput, usuarioId: bigint) {
    const cliente = await this.db.cliente.findUnique({
      where: { id: input.clienteId },
      select: {
        id: true,
        estado: true,
        requiereCertificado: true,
        nombre: true,
        claveSap: true,
        contactoCorreo: true,
      },
    });
    if (!cliente) throw new NotFoundError("Cliente no encontrado");
    if (cliente.estado !== "ACTIVO") {
      throw new UnprocessableEntityError(
        "El cliente no se encuentra activo",
        { codigo: "CLIENTE_INACTIVO" },
      );
    }
    if (!cliente.requiereCertificado) {
      throw new UnprocessableEntityError(
        "El cliente no requiere certificado",
        { codigo: "CLIENTE_NO_REQUIERE_CERTIFICADO" },
      );
    }
    if (!cliente.contactoCorreo) {
      throw new UnprocessableEntityError(
        "El cliente no tiene un correo de contacto registrado",
        { codigo: "CLIENTE_SIN_CORREO" },
      );
    }

    const lote = await this.db.loteProduccion.findUnique({
      where: { id: input.loteId },
      select: {
        id: true,
        numeroLote: true,
        cantidadProducida: true,
        unidadCantidad: true,
      },
    });
    if (!lote) throw new NotFoundError("Lote no encontrado");


    const inspecciones = await this.db.inspeccion.findMany({
      where: { id: { in: input.inspeccionIds } },
      select: { id: true, loteId: true, estado: true },
    });

    if (inspecciones.length !== input.inspeccionIds.length) {
      throw new UnprocessableEntityError(
        "Una o más inspecciones no existen",
        { codigo: "INSPECCION_NO_EXISTE" },
      );
    }
    const fueraDeLote = inspecciones.filter(
      (i) => i.loteId !== input.loteId,
    );
    if (fueraDeLote.length > 0) {
      throw new UnprocessableEntityError(
        "Todas las inspecciones deben pertenecer al lote indicado",
        {
          codigo: "INSPECCION_LOTE_INVALIDO",
          inspeccionIds: fueraDeLote.map((i) => i.id.toString()),
        },
      );
    }
    const abiertas = inspecciones.filter((i) => i.estado !== "CERRADA");
    if (abiertas.length > 0) {
      throw new UnprocessableEntityError(
        "Todas las inspecciones deben estar cerradas para emitir certificado",
        {
          codigo: "INSPECCION_NO_CERRADA",
          inspeccionIds: abiertas.map((i) => i.id.toString()),
        },
      );
    }

    const numero = await generarNumeroCertificado(this.db);
    const embarque = input.datosEmbarque;

    let certificadoId: bigint;

    try {
      certificadoId = await this.db.$transaction(async (tx) => {
        if (lote.cantidadProducida !== null) {
          // Lock the lote row with SELECT FOR UPDATE to prevent write-skew
          // under PostgreSQL READ COMMITTED. Prisma does not expose FOR UPDATE
          // via its typed query API, so $queryRaw with a tagged template is
          // required. The tagged template parameterises input.loteId safely
          // — there is no string interpolation.
          await tx.$queryRaw`SELECT id FROM lotes_produccion WHERE id = ${input.loteId} FOR UPDATE`;

          const agg = await tx.certificado.aggregate({
            where: { loteId: input.loteId },
            _sum: { cantidadEntrega: true },
          });
          const entregada = agg._sum.cantidadEntrega ?? new Prisma.Decimal(0);
          const disponible = lote.cantidadProducida.minus(entregada);
          const cantidadEntrega = new Prisma.Decimal(
            embarque.cantidadEntrega,
          );
          if (cantidadEntrega.greaterThan(disponible)) {
            throw new UnprocessableEntityError(
              `La cantidad a entregar (${cantidadEntrega.toString()}) excede el saldo disponible del lote (${disponible.toString()} ${lote.unidadCantidad ?? ""}).`.trim(),
              {
                codigo: "LOTE_SALDO_INSUFICIENTE",
                producida: lote.cantidadProducida.toString(),
                entregada: entregada.toString(),
                disponible: disponible.toString(),
                solicitada: cantidadEntrega.toString(),
                unidadCantidad: lote.unidadCantidad,
              },
            );
          }
        }

        const cert = await tx.certificado.create({
          data: {
            numero,
            clienteId: input.clienteId,
            loteId: input.loteId,
            estado: "EMITIDO",
            numOrdenCompra: embarque.numOrdenCompra,
            cantidadSolicitada: new Prisma.Decimal(embarque.cantidadSolicitada),
            cantidadEntrega: new Prisma.Decimal(embarque.cantidadEntrega),
            numFactura: embarque.numFactura,
            fechaEnvio: new Date(embarque.fechaEnvio),
            fechaCaducidad: new Date(embarque.fechaCaducidad),
            creadoPor: usuarioId,
          },
        });

        await tx.certificadoInspeccion.createMany({
          data: input.inspeccionIds.map((inspeccionId, idx) => ({
            certificadoId: cert.id,
            inspeccionId,
            orden: idx + 1,
          })),
        });

        await tx.envioCertificado.createMany({
          data: [
            {
              certificadoId: cert.id,
              destinatarioTipo: "CLIENTE",
              destinatarioCorreo: cliente.contactoCorreo!,
              estado: "PENDIENTE",
            },
            {
              certificadoId: cert.id,
              destinatarioTipo: "ALMACEN",
              destinatarioCorreo: env.WAREHOUSE_EMAIL,
              estado: "PENDIENTE",
            },
          ],
        });

        await auditLog(tx, {
          usuarioId,
          entidad: "Certificado",
          entidadId: cert.id,
          accion: "EMITIR",
          detalle: {
            numero,
            clienteId: input.clienteId.toString(),
            loteId: input.loteId.toString(),
            inspecciones: input.inspeccionIds.map((id) => id.toString()),
          },
        });

        return cert.id;
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictError(
          "Colisión al generar el número de certificado; reintente la emisión",
          { codigo: "NUMERO_CERTIFICADO_DUPLICADO" },
        );
      }
      throw err;
    }

    // Fuera de la transacción: generar PDF. Si falla, revertir.
    let rutaPdf: string;
    try {
      rutaPdf = await certificadoPdfService.generar(certificadoId);
      await this.db.certificado.update({
        where: { id: certificadoId },
        data: { rutaPdf },
      });
    } catch (err) {
      logger.error({ err, certificadoId }, "PDF generation failed; reverting");
      await this.db.$transaction(async (tx) => {
        await tx.envioCertificado.deleteMany({
          where: { certificadoId },
        });
        await tx.certificadoInspeccion.deleteMany({
          where: { certificadoId },
        });
        await tx.certificado.delete({ where: { id: certificadoId } });
        await auditLog(tx, {
          usuarioId,
          entidad: "Certificado",
          entidadId: certificadoId,
          accion: "EMISION_REVERTIDA",
          detalle: {
            numero,
            motivo:
              err instanceof Error ? err.message : "Error desconocido al generar PDF",
          },
        });
      });
      throw new UnprocessableEntityError(
        "No se pudo generar el PDF del certificado; la emisión fue revertida",
        { codigo: "PDF_GENERACION_FALLO" },
      );
    }

    // Disparar envíos async sin bloquear la respuesta HTTP
    setImmediate(() => {
      this.procesarEnviosIniciales(certificadoId, rutaPdf).catch((err) => {
        logger.error({ err, certificadoId }, "async mail dispatch failed");
      });
    });

    return this.getById(certificadoId);
  }

  private async procesarEnviosIniciales(
    certificadoId: bigint,
    rutaPdf: string,
  ): Promise<void> {
    const cert = await this.db.certificado.findUnique({
      where: { id: certificadoId },
      include: {
        cliente: { select: { nombre: true } },
        lote: { select: { numeroLote: true } },
        envios: { where: { estado: "PENDIENTE" } },
      },
    });
    if (!cert) return;

    for (const envio of cert.envios) {
      await this.intentarEnvio(envio.id, certificadoId, rutaPdf, {
        numero: cert.numero,
        clienteNombre: cert.cliente.nombre,
        numeroLote: cert.lote.numeroLote,
      });
    }

    await this.recalcularEstadoCertificado(certificadoId);
  }

  private async intentarEnvio(
    envioId: bigint,
    certificadoId: bigint,
    rutaPdf: string,
    ctx: { numero: string; clienteNombre: string; numeroLote: string },
  ): Promise<void> {
    const envio = await this.db.envioCertificado.findUnique({
      where: { id: envioId },
    });
    if (!envio) return;

    const intentoActual = envio.intentos + 1;
    if (intentoActual > MAX_INTENTOS_ENVIO) {
      await this.db.envioCertificado.update({
        where: { id: envioId },
        data: { estado: "FALLIDO", intentos: envio.intentos },
      });
      return;
    }

    const numero = escapeHtml(ctx.numero);
    const clienteNombre = escapeHtml(ctx.clienteNombre);
    const numeroLote = escapeHtml(ctx.numeroLote);
    const appBaseUrl = escapeHtml(env.APP_BASE_URL);
    const normalizeEmailHeaderValue = (value: string): string =>
      value.replace(/[\r\n]+/g, " ").trim();
    const numeroSubject = normalizeEmailHeaderValue(ctx.numero);
    const numeroLoteSubject = normalizeEmailHeaderValue(ctx.numeroLote);
    const subject = `Certificado de calidad ${numeroSubject} — Lote ${numeroLoteSubject}`;
    const html = `
      <p>Estimado(a) ${clienteNombre},</p>
      <p>Adjunto encontrará el certificado de calidad <strong>${numero}</strong>
      correspondiente al lote <strong>${numeroLote}</strong>.</p>
      <p>Este correo fue enviado desde el sistema de certificados FHESA.
      Si tiene dudas, por favor responda a este mensaje o visite
      <a href="${appBaseUrl}">${appBaseUrl}</a>.</p>
      <p>Atentamente,<br/>Fábrica de Harinas Elizondo, S.A. de C.V.</p>
    `;

    const result = await enviarCorreo({
      to: envio.destinatarioCorreo,
      subject,
      html,
      attachments: [
        {
          filename: `${ctx.numero}.pdf`,
          path: rutaPdf,
          contentType: "application/pdf",
        },
      ],
    });

    if (result.success) {
      await this.db.envioCertificado.update({
        where: { id: envioId },
        data: {
          estado: "ENVIADO",
          intentos: intentoActual,
          enviadoEn: new Date(),
          ultimoError: null,
        },
      });
    } else {
      const permanente = intentoActual >= MAX_INTENTOS_ENVIO;
      await this.db.envioCertificado.update({
        where: { id: envioId },
        data: {
          estado: permanente ? "FALLIDO" : "PENDIENTE",
          intentos: intentoActual,
          ultimoError: result.error?.slice(0, 500) ?? "Error desconocido",
        },
      });
    }
  }

  private async recalcularEstadoCertificado(
    certificadoId: bigint,
  ): Promise<void> {
    const envios = await this.db.envioCertificado.findMany({
      where: { certificadoId },
      select: { estado: true },
    });
    if (envios.length === 0) return;

    const todosEnviados = envios.every((e) => e.estado === "ENVIADO");
    const algunoEnviado = envios.some((e) => e.estado === "ENVIADO");

    let estado: "EMITIDO" | "ENVIO_PARCIAL" | "ENVIADO" = "EMITIDO";
    if (todosEnviados) estado = "ENVIADO";
    else if (algunoEnviado) estado = "ENVIO_PARCIAL";

    await this.db.certificado.update({
      where: { id: certificadoId },
      data: { estado },
    });
  }

  async getPdfPath(id: bigint): Promise<string> {
    const cert = await this.db.certificado.findUnique({
      where: { id },
      select: { id: true, rutaPdf: true },
    });
    if (!cert) throw new NotFoundError("Certificado no encontrado");
    if (!cert.rutaPdf) {
      throw new NotFoundError("El PDF del certificado aún no está disponible");
    }
    try {
      await fs.access(cert.rutaPdf);
    } catch {
      throw new NotFoundError("El archivo PDF no existe en el almacenamiento");
    }
    return cert.rutaPdf;
  }

  async reenviar(id: bigint, usuarioId: bigint) {
    const cert = await this.db.certificado.findUnique({
      where: { id },
      include: {
        cliente: { select: { nombre: true } },
        lote: { select: { numeroLote: true } },
        envios: true,
      },
    });
    if (!cert) throw new NotFoundError("Certificado no encontrado");
    if (!cert.rutaPdf) {
      throw new ConflictError(
        "El certificado no tiene PDF disponible para reenviar",
        { codigo: "PDF_NO_DISPONIBLE" },
      );
    }

    const pendientes = cert.envios.filter(
      (e) => e.estado === "PENDIENTE" || e.estado === "FALLIDO",
    );
    if (pendientes.length === 0) {
      throw new ConflictError(
        "No hay envíos pendientes o fallidos que reintentar",
        { codigo: "NO_HAY_ENVIOS_PENDIENTES" },
      );
    }

    for (const envio of pendientes) {
      await this.intentarEnvio(envio.id, cert.id, cert.rutaPdf, {
        numero: cert.numero,
        clienteNombre: cert.cliente.nombre,
        numeroLote: cert.lote.numeroLote,
      });
    }

    await this.recalcularEstadoCertificado(cert.id);

    await auditLog(this.db, {
      usuarioId,
      entidad: "Certificado",
      entidadId: cert.id,
      accion: "REENVIAR",
      detalle: {
        enviosReintentados: pendientes.length,
      },
    });

    return this.getById(cert.id);
  }
}

export const certificadosService = new CertificadosService();
