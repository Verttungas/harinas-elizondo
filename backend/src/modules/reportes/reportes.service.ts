import type { Prisma, PrismaClient } from "@prisma/client";
import { stringify as csvStringify } from "csv-stringify/sync";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import {
  buildPaginationResponse,
  parsePaginationQuery,
} from "../../lib/pagination.js";
import { UnprocessableEntityError } from "../../domain/errors.js";
import type {
  ActualizarReporteGuardadoInput,
  CertificadosPorClienteQuery,
  CrearReporteGuardadoInput,
  DesviacionesQuery,
  ExportQuery,
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
    const data = Object.fromEntries(
      [
        ["nombre", input.nombre],
        ["descripcion", input.descripcion],
        ["tipo", input.tipo],
        ["filtros", input.filtros as Prisma.InputJsonValue | undefined],
        ["activo", input.activo],
      ].filter(([, value]) => value !== undefined),
    ) as Prisma.ReporteGuardadoUpdateInput;

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
      lotesActivos,
      entregasPorLote,
      certificadosConLoteActual,
      certificadosConLoteAnterior
    ] = await Promise.all([
      this.db.certificado.count({
        where: { fechaEmision: { gte: inicioMesActual } },
      }),
      this.db.certificado.count({
        where: {
          fechaEmision: { gte: inicioMesAnterior, lt: inicioMesActual },
        },
      }),
      this.db.loteProduccion.findMany({
        where: {
          cantidadProducida: { not: null },
          inspecciones: { some: { estado: "CERRADA" } }
        },
        select: {
          id: true,
          cantidadProducida: true,
        }
      }),
      this.db.certificado.groupBy({
        by: ["loteId"],
        where: {
          lote: {
            cantidadProducida: { not: null },
            inspecciones: { some: { estado: "CERRADA" } },
          },
        },
        _sum: { cantidadEntrega: true },
      }),
      this.db.certificado.findMany({
        where: { fechaEmision: { gte: inicioMesActual } },
        select: { fechaEmision: true, lote: { select: { fechaProduccion: true } } }
      }),
      this.db.certificado.findMany({
        where: { fechaEmision: { gte: inicioMesAnterior, lt: inicioMesActual } },
        select: { fechaEmision: true, lote: { select: { fechaProduccion: true } } }
      })
    ]);

    // Cálculo: Saldo Global de Harina
    const entregasPorLoteMap = new Map(
      entregasPorLote.map((row) => [
        row.loteId.toString(),
        Number(row._sum.cantidadEntrega ?? 0),
      ]),
    );

    let saldoGlobal = 0;
    for (const lote of lotesActivos) {
      const producida = Number(lote.cantidadProducida ?? 0);
      const entregada = entregasPorLoteMap.get(lote.id.toString()) ?? 0;
      saldoGlobal += Math.max(0, producida - entregada);
    }

    // Cálculo: Tiempo Medio de Certificación (Días)
    type CertificadoConFechaLote = Prisma.CertificadoGetPayload<{
      select: {
        fechaEmision: true;
        lote: { select: { fechaProduccion: true } };
      };
    }>;

    const calcTiempoMedio = (certs: CertificadoConFechaLote[]) => {
      if (certs.length === 0) return 0;
      const diffs = certs.map((c) => c.fechaEmision.getTime() - c.lote.fechaProduccion.getTime());
      const avgMs = diffs.reduce((sum, val) => sum + val, 0) / certs.length;
      return avgMs / (1000 * 60 * 60 * 24); // Convertir a días
    };

    const tiempoMedioActual = calcTiempoMedio(certificadosConLoteActual);
    const tiempoMedioAnterior = calcTiempoMedio(certificadosConLoteAnterior);
    
    const variacionMes = certificadosMesActual - certificadosMesAnterior;
    const variacionDias = Number((tiempoMedioActual - tiempoMedioAnterior).toFixed(1));

    return {
      certificadosEmitidos: {
        valor: certificadosMesActual,
        variacionMesAnterior: variacionMes,
      },
      saldoGlobal: {
        valor: Number(saldoGlobal.toFixed(2)),
      },
      tiempoMedioCertificacion: {
        valor: Number(tiempoMedioActual.toFixed(1)),
        variacionDias,
      },
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
    }
  }
}

export const reportesService = new ReportesService();
