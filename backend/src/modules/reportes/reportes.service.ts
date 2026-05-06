import type { Prisma, PrismaClient } from "@prisma/client";
import { stringify as csvStringify } from "csv-stringify/sync";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import {
  buildPaginationResponse,
  parsePaginationQuery,
  type PaginationResponse,
} from "../../lib/pagination.js";
import { UnprocessableEntityError } from "../../domain/errors.js";
import type {
  ActualizarReporteGuardadoInput,
  CertificadosPorClienteQuery,
  CrearReporteGuardadoInput,
  DesviacionesQuery,
  ExportQuery,
  FicticiasQuery,
  ListReportesGuardadosQuery,
  ParametrosQuery,
} from "./reportes.schemas.js";

function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function firstOfPreviousMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
}

export class ReportesService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async listGuardados(query: ListReportesGuardadosQuery) {
    const { page, limit, skip, take } = parsePaginationQuery(query);
    const where = {
      ...(query.estado !== "TODOS" ? { activo: query.estado === "ACTIVO" } : {}),
      ...(query.tipo !== "TODOS" ? { tipo: query.tipo } : {}),
      ...(query.q
        ? {
            OR: [
              { nombre: { contains: query.q, mode: "insensitive" as const } },
              { descripcion: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.reporteGuardado.findMany({
        where,
        orderBy: [{ activo: "desc" }, { actualizadoEn: "desc" }],
        skip,
        take,
      }),
      this.db.reporteGuardado.count({ where }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async crearGuardado(input: CrearReporteGuardadoInput, usuarioId: bigint) {
    const data: Prisma.ReporteGuardadoUncheckedCreateInput = {
      nombre: input.nombre,
      descripcion: input.descripcion,
      tipo: input.tipo,
      filtros: input.filtros as Prisma.InputJsonValue,
      creadoPor: usuarioId,
    };

    return this.db.reporteGuardado.create({
      data,
    });
  }

  async actualizarGuardado(id: bigint, input: ActualizarReporteGuardadoInput) {
    const data: Prisma.ReporteGuardadoUpdateInput = {};
    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.descripcion !== undefined) data.descripcion = input.descripcion;
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.filtros !== undefined) {
      data.filtros = input.filtros as Prisma.InputJsonValue;
    }
    if (input.activo !== undefined) data.activo = input.activo;

    return this.db.reporteGuardado.update({
      where: { id },
      data,
    });
  }

  async eliminarGuardado(id: bigint) {
    return this.db.reporteGuardado.update({
      where: { id },
      data: { activo: false },
    });
  }

  async resumen() {
    const now = new Date();
    const inicioMesActual = firstOfMonth(now);
    const inicioMesAnterior = firstOfPreviousMonth(now);

    const [
      certificadosMesActual,
      certificadosMesAnterior,
      ficticiasMesActual,
      clientesActivos,
      resultadosMesActual,
    ] = await Promise.all([
      this.db.certificado.count({
        where: { fechaEmision: { gte: inicioMesActual } },
      }),
      this.db.certificado.count({
        where: {
          fechaEmision: { gte: inicioMesAnterior, lt: inicioMesActual },
        },
      }),
      this.db.inspeccion.count({
        where: {
          esFicticia: true,
          fechaInspeccion: { gte: inicioMesActual },
        },
      }),
      this.db.cliente.count({ where: { estado: "ACTIVO" } }),
      this.db.resultadoInspeccion.findMany({
        where: {
          inspeccion: {
            estado: "CERRADA",
            fechaInspeccion: { gte: inicioMesActual },
          },
        },
        select: { dentroEspecificacion: true, inspeccion: { select: { loteId: true } } },
      }),
    ]);

    // % lotes en especificación (mes actual)
    const lotesPorEspec = new Map<string, boolean>();
    for (const r of resultadosMesActual) {
      const key = r.inspeccion.loteId.toString();
      const prev = lotesPorEspec.get(key);
      lotesPorEspec.set(key, (prev ?? true) && r.dentroEspecificacion);
    }
    const totalLotes = lotesPorEspec.size;
    const lotesOk = Array.from(lotesPorEspec.values()).filter(Boolean).length;
    const porcentajeActual =
      totalLotes === 0 ? 0 : (lotesOk / totalLotes) * 100;

    // Mes anterior (mismo cálculo para variacionPuntos)
    const resultadosMesAnterior = await this.db.resultadoInspeccion.findMany({
      where: {
        inspeccion: {
          estado: "CERRADA",
          fechaInspeccion: {
            gte: inicioMesAnterior,
            lt: inicioMesActual,
          },
        },
      },
      select: {
        dentroEspecificacion: true,
        inspeccion: { select: { loteId: true } },
      },
    });
    const lotesPrev = new Map<string, boolean>();
    for (const r of resultadosMesAnterior) {
      const key = r.inspeccion.loteId.toString();
      const prev = lotesPrev.get(key);
      lotesPrev.set(key, (prev ?? true) && r.dentroEspecificacion);
    }
    const totalPrev = lotesPrev.size;
    const okPrev = Array.from(lotesPrev.values()).filter(Boolean).length;
    const porcentajePrev = totalPrev === 0 ? 0 : (okPrev / totalPrev) * 100;

    const variacionMes = certificadosMesActual - certificadosMesAnterior;
    const variacionPuntos = Number(
      (porcentajeActual - porcentajePrev).toFixed(2),
    );

    return {
      certificadosEmitidos: {
        valor: certificadosMesActual,
        variacionMesAnterior: variacionMes,
      },
      lotesEnEspecificacion: {
        valor: Number(porcentajeActual.toFixed(2)),
        variacionPuntos,
      },
      clientesActivos: { valor: clientesActivos },
      inspeccionesFicticias: { valor: ficticiasMesActual },
    };
  }

  async parametros(query: ParametrosQuery) {
    const parametro = await this.db.parametro.findUnique({
      where: { id: query.parametroId },
      select: {
        id: true,
        clave: true,
        nombre: true,
        unidadMedida: true,
        limiteInferior: true,
        limiteSuperior: true,
      },
    });
    if (!parametro) {
      throw new UnprocessableEntityError("Parámetro no existe", {
        codigo: "PARAMETRO_NO_EXISTE",
      });
    }

    const where: Record<string, unknown> = {
      parametroId: query.parametroId,
      inspeccion: {
        fechaInspeccion: {
          gte: new Date(query.desde),
          lte: new Date(query.hasta),
        },
      },
    };

    if (query.clienteId !== undefined) {
      (where.inspeccion as Record<string, unknown>) = {
        ...(where.inspeccion as object),
        certificadoInspeccion: {
          some: {
            certificado: { clienteId: query.clienteId },
          },
        },
      };
    }

    const resultados = await this.db.resultadoInspeccion.findMany({
      where: where as never,
      include: {
        inspeccion: {
          select: {
            id: true,
            secuencia: true,
            esFicticia: true,
            fechaInspeccion: true,
            lote: { select: { id: true, numeroLote: true } },
          },
        },
      },
      orderBy: { inspeccion: { fechaInspeccion: "asc" } },
    });

    return {
      parametro,
      puntos: resultados.map((r) => ({
        fecha: r.inspeccion.fechaInspeccion,
        loteId: r.inspeccion.lote.id,
        numeroLote: r.inspeccion.lote.numeroLote,
        secuencia: r.inspeccion.secuencia,
        valor: Number(r.valor.toString()),
        dentroEspecificacion: r.dentroEspecificacion,
        esFicticia: r.inspeccion.esFicticia,
      })),
    };
  }

  async certificadosPorCliente(query: CertificadosPorClienteQuery) {
    const agrupado = await this.db.certificado.groupBy({
      by: ["clienteId"],
      where: {
        fechaEmision: {
          gte: new Date(query.desde),
          lte: new Date(query.hasta),
        },
      },
      _count: { _all: true },
    });

    if (agrupado.length === 0) return [];

    const clientes = await this.db.cliente.findMany({
      where: { id: { in: agrupado.map((a) => a.clienteId) } },
      select: { id: true, claveSap: true, nombre: true },
    });
    const porId = new Map(clientes.map((c) => [c.id.toString(), c]));

    return agrupado
      .map((row) => {
        const cliente = porId.get(row.clienteId.toString());
        return {
          clienteId: row.clienteId,
          claveSap: cliente?.claveSap ?? "",
          clienteNombre: cliente?.nombre ?? "Cliente desconocido",
          totalCertificados: row._count._all,
        };
      })
      .sort((a, b) => b.totalCertificados - a.totalCertificados);
  }

  async desviaciones(query: DesviacionesQuery) {
    const where: Record<string, unknown> = {
      inspeccion: {
        fechaInspeccion: {
          gte: new Date(query.desde),
          lte: new Date(query.hasta),
        },
      },
    };
    if (query.productoId !== undefined) {
      (where.inspeccion as Record<string, unknown>) = {
        ...(where.inspeccion as object),
        lote: { productoId: query.productoId },
      };
    }

    const resultados = await this.db.resultadoInspeccion.findMany({
      where: where as never,
      select: {
        dentroEspecificacion: true,
        inspeccion: {
          select: {
            loteId: true,
            lote: {
              select: {
                numeroLote: true,
                producto: { select: { id: true, clave: true, nombre: true } },
              },
            },
          },
        },
      },
    });

    const mapa = new Map<
      string,
      {
        loteId: bigint;
        numeroLote: string;
        productoClave: string;
        productoNombre: string;
        total: number;
        fuera: number;
      }
    >();
    for (const r of resultados) {
      const key = r.inspeccion.loteId.toString();
      const cur = mapa.get(key) ?? {
        loteId: r.inspeccion.loteId,
        numeroLote: r.inspeccion.lote.numeroLote,
        productoClave: r.inspeccion.lote.producto.clave,
        productoNombre: r.inspeccion.lote.producto.nombre,
        total: 0,
        fuera: 0,
      };
      cur.total += 1;
      if (!r.dentroEspecificacion) cur.fuera += 1;
      mapa.set(key, cur);
    }

    return Array.from(mapa.values())
      .map((x) => ({
        ...x,
        porcentajeFuera: x.total === 0 ? 0 : Number(((x.fuera / x.total) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.porcentajeFuera - a.porcentajeFuera)
      .slice(0, 20);
  }

  async ficticias(query: FicticiasQuery): Promise<PaginationResponse<unknown>> {
    const { page, limit, skip, take } = parsePaginationQuery(query);

    const where: Record<string, unknown> = { esFicticia: true };
    if (query.desde || query.hasta) {
      const rango: Record<string, Date> = {};
      if (query.desde) rango.gte = new Date(query.desde);
      if (query.hasta) rango.lte = new Date(query.hasta);
      where.fechaInspeccion = rango;
    }

    const [data, total] = await this.db.$transaction([
      this.db.inspeccion.findMany({
        where: where as never,
        skip,
        take,
        orderBy: { fechaInspeccion: "desc" },
        include: {
          lote: { select: { id: true, numeroLote: true } },
          inspeccionOrigen: {
            select: { id: true, secuencia: true },
          },
        },
      }),
      this.db.inspeccion.count({ where: where as never }),
    ]);

    return buildPaginationResponse(data, total, page, limit);
  }

  async exportCsv(query: ExportQuery): Promise<string> {
    switch (query.tipo) {
      case "parametros": {
        if (!query.parametroId || !query.desde || !query.hasta) {
          throw new UnprocessableEntityError(
            "Faltan filtros para exportar 'parametros' (parametroId, desde, hasta)",
            { codigo: "EXPORT_FILTROS_INSUFICIENTES" },
          );
        }
        const res = await this.parametros({
          parametroId: query.parametroId,
          desde: query.desde,
          hasta: query.hasta,
          clienteId: query.clienteId,
        });
        return csvStringify(
          res.puntos.map((p) => ({
            fecha: p.fecha.toISOString(),
            lote_id: p.loteId.toString(),
            numero_lote: p.numeroLote,
            secuencia: p.secuencia,
            valor: p.valor,
            dentro_especificacion: p.dentroEspecificacion ? "SI" : "NO",
            es_ficticia: p.esFicticia ? "SI" : "NO",
          })),
          { header: true },
        );
      }
      case "certificados-por-cliente": {
        if (!query.desde || !query.hasta) {
          throw new UnprocessableEntityError(
            "Faltan filtros (desde, hasta)",
            { codigo: "EXPORT_FILTROS_INSUFICIENTES" },
          );
        }
        const res = await this.certificadosPorCliente({
          desde: query.desde,
          hasta: query.hasta,
        });
        return csvStringify(
          res.map((r) => ({
            cliente_id: r.clienteId.toString(),
            clave_sap: r.claveSap,
            cliente_nombre: r.clienteNombre,
            total_certificados: r.totalCertificados,
          })),
          { header: true },
        );
      }
      case "desviaciones": {
        if (!query.desde || !query.hasta) {
          throw new UnprocessableEntityError(
            "Faltan filtros (desde, hasta)",
            { codigo: "EXPORT_FILTROS_INSUFICIENTES" },
          );
        }
        const res = await this.desviaciones({
          desde: query.desde,
          hasta: query.hasta,
          productoId: query.productoId,
        });
        return csvStringify(
          res.map((r) => ({
            lote_id: r.loteId.toString(),
            numero_lote: r.numeroLote,
            producto_clave: r.productoClave,
            producto_nombre: r.productoNombre,
            total_resultados: r.total,
            fuera_especificacion: r.fuera,
            porcentaje_fuera: r.porcentajeFuera,
          })),
          { header: true },
        );
      }
      case "ficticias": {
        const res = await this.ficticias({
          page: 1,
          limit: 100,
          desde: query.desde,
          hasta: query.hasta,
        });
        const data = res.data as Array<{
          id: bigint;
          secuencia: string;
          fechaInspeccion: Date;
          justificacionAjuste: string | null;
          lote: { numeroLote: string };
          inspeccionOrigen: { secuencia: string } | null;
        }>;
        return csvStringify(
          data.map((i) => ({
            inspeccion_id: i.id.toString(),
            numero_lote: i.lote.numeroLote,
            secuencia: i.secuencia,
            secuencia_origen: i.inspeccionOrigen?.secuencia ?? "",
            fecha_inspeccion: i.fechaInspeccion.toISOString(),
            justificacion: i.justificacionAjuste ?? "",
          })),
          { header: true },
        );
      }
    }
  }
}

export const reportesService = new ReportesService();
