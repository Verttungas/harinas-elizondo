import { promises as fs } from "node:fs";
import { createWriteStream } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../domain/errors.js";

interface ParametroRango {
  limiteInferior: string;
  limiteSuperior: string;
  origen: "cliente" | "internacional";
}

const COLOR_OK = "#1f7a1f";
const COLOR_FAIL = "#b00020";
const COLOR_HEADER_BG = "#0c2340";
const COLOR_HEADER_TEXT = "#ffffff";
const COLOR_MUTED = "#555555";

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || Number.isNaN(d.getTime())) return "—";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}`;
}

function formatDecimal(
  value: { toString(): string } | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined) return "—";
  const num = Number(value.toString());
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(digits);
}

export class CertificadoPdfService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async generar(certificadoId: bigint): Promise<string> {
    const cert = await this.db.certificado.findUnique({
      where: { id: certificadoId },
      include: {
        cliente: {
          include: {
            valoresReferencia: true,
          },
        },
        lote: { include: { producto: true } },
        usuarioCreador: { select: { id: true, nombre: true, correo: true } },
        certificadoInspeccion: {
          include: {
            inspeccion: {
              include: {
                resultados: {
                  include: { parametro: true },
                },
              },
            },
          },
          orderBy: { orden: "asc" },
        },
      },
    });

    if (!cert) throw new NotFoundError("Certificado no encontrado");

    const year = cert.fechaEmision.getUTCFullYear().toString();
    const month = String(cert.fechaEmision.getUTCMonth() + 1).padStart(2, "0");
    const dir = path.join(env.PDF_STORAGE_PATH, year, month);
    await fs.mkdir(dir, { recursive: true });
    const outputPath = path.join(dir, `${cert.numero}.pdf`);

    // Índice de rangos por parametroId: cliente tiene prioridad, fallback internacional
    const rangoPorParametro = new Map<string, ParametroRango>();
    const rangoCliente = new Map(
      cert.cliente.valoresReferencia.map((vr) => [vr.parametroId.toString(), vr]),
    );

    // Consolidar resultados: última inspección gana si hay duplicados; ficticia sobre original
    const inspeccionesOrdenadas = cert.certificadoInspeccion
      .map((ci) => ci.inspeccion)
      .sort((a, b) => {
        if (a.esFicticia !== b.esFicticia) return a.esFicticia ? 1 : -1;
        return a.secuencia.localeCompare(b.secuencia);
      });

    type ResultadoConsolidado = {
      parametroId: bigint;
      claveParametro: string;
      nombreParametro: string;
      unidadMedida: string;
      valor: string;
      desviacion: string;
      dentroEspecificacion: boolean;
      rango: ParametroRango;
    };

    const consolidados = new Map<string, ResultadoConsolidado>();
    for (const inspeccion of inspeccionesOrdenadas) {
      for (const r of inspeccion.resultados) {
        const pid = r.parametroId.toString();
        const vrCliente = rangoCliente.get(pid);
        const rango: ParametroRango = vrCliente
          ? {
              limiteInferior: vrCliente.limiteInferior.toString(),
              limiteSuperior: vrCliente.limiteSuperior.toString(),
              origen: "cliente",
            }
          : {
              limiteInferior: r.parametro.limiteInferior.toString(),
              limiteSuperior: r.parametro.limiteSuperior.toString(),
              origen: "internacional",
            };
        rangoPorParametro.set(pid, rango);

        // Para el certificado, evaluar dentro del rango aplicable (cliente vs. internacional)
        const valorNum = Number(r.valor.toString());
        const lo = Number(rango.limiteInferior);
        const hi = Number(rango.limiteSuperior);
        const dentro = valorNum >= lo && valorNum <= hi;

        consolidados.set(pid, {
          parametroId: r.parametroId,
          claveParametro: r.parametro.clave,
          nombreParametro: r.parametro.nombre,
          unidadMedida: r.parametro.unidadMedida,
          valor: formatDecimal(r.valor, 4),
          desviacion:
            r.desviacion !== null ? formatDecimal(r.desviacion, 4) : "—",
          dentroEspecificacion: dentro,
          rango,
        });
      }
    }

    const filas = Array.from(consolidados.values()).sort((a, b) =>
      a.claveParametro.localeCompare(b.claveParametro),
    );

    const cumpleTodo = filas.every((f) => f.dentroEspecificacion);

    await this.renderPdf(outputPath, {
      numero: cert.numero,
      fechaEmision: cert.fechaEmision,
      cliente: {
        claveSap: cert.cliente.claveSap,
        nombre: cert.cliente.nombre,
        rfc: cert.cliente.rfc,
        domicilio: cert.cliente.domicilio ?? "—",
        contactoNombre: cert.cliente.contactoNombre ?? "—",
      },
      producto: {
        clave: cert.lote.producto.clave,
        nombre: cert.lote.producto.nombre,
      },
      lote: {
        numeroLote: cert.lote.numeroLote,
        fechaProduccion: cert.lote.fechaProduccion,
      },
      embarque: {
        numOrdenCompra: cert.numOrdenCompra ?? "—",
        cantidadSolicitada: formatDecimal(cert.cantidadSolicitada, 2),
        cantidadEntrega: formatDecimal(cert.cantidadEntrega, 2),
        numFactura: cert.numFactura ?? "—",
        fechaEnvio: cert.fechaEnvio,
        fechaCaducidad: cert.fechaCaducidad,
      },
      filas,
      dictamen: cumpleTodo,
      inspeccionesConsolidadas: inspeccionesOrdenadas.map((i) => ({
        secuencia: i.secuencia,
        esFicticia: i.esFicticia,
        fechaInspeccion: i.fechaInspeccion,
      })),
      usuarioEmisor: cert.usuarioCreador.nombre,
    });

    return outputPath;
  }

  private renderPdf(outputPath: string, data: PdfData): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: { Title: `Certificado ${data.numero}`, Author: "FHESA" },
      });
      const stream = createWriteStream(outputPath);
      stream.on("finish", () => resolve());
      stream.on("error", reject);
      doc.on("error", reject);
      doc.pipe(stream);

      doc.font("Helvetica");

      // Header
      doc
        .rect(60, 50, doc.page.width - 120, 48)
        .fill(COLOR_HEADER_BG);
      doc
        .fillColor(COLOR_HEADER_TEXT)
        .font("Helvetica-Bold")
        .fontSize(13)
        .text("FÁBRICA DE HARINAS ELIZONDO, S.A. DE C.V.", 72, 62, {
          width: doc.page.width - 240,
        });
      doc
        .fontSize(11)
        .text(data.numero, doc.page.width - 60 - 160, 62, {
          width: 148,
          align: "right",
        });
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(`Emisión: ${formatDate(data.fechaEmision)}`, doc.page.width - 60 - 160, 82, {
          width: 148,
          align: "right",
        });

      doc.moveDown(3);
      doc
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("CERTIFICADO DE CALIDAD", { align: "center" });
      doc.moveDown(0.5);

      // Bloques: Cliente / Producto-Lote / Embarque
      this.renderInfoBlock(doc, "CLIENTE", [
        ["Clave SAP", data.cliente.claveSap],
        ["Razón social", data.cliente.nombre],
        ["RFC", data.cliente.rfc],
        ["Domicilio", data.cliente.domicilio],
        ["Contacto", data.cliente.contactoNombre],
      ]);

      this.renderInfoBlock(doc, "PRODUCTO Y LOTE", [
        ["Clave producto", data.producto.clave],
        ["Producto", data.producto.nombre],
        ["Número de lote", data.lote.numeroLote],
        ["Fecha producción", formatDate(data.lote.fechaProduccion)],
      ]);

      this.renderInfoBlock(doc, "DATOS DE EMBARQUE", [
        ["Orden de compra", data.embarque.numOrdenCompra],
        ["Factura", data.embarque.numFactura],
        [
          "Cantidad solicitada / entrega",
          `${data.embarque.cantidadSolicitada} / ${data.embarque.cantidadEntrega}`,
        ],
        ["Fecha de envío", formatDate(data.embarque.fechaEnvio)],
        ["Fecha de caducidad", formatDate(data.embarque.fechaCaducidad)],
      ]);

      doc.moveDown(0.5);
      this.renderResultadosTable(doc, data.filas);

      doc.moveDown(1);
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(data.dictamen ? COLOR_OK : COLOR_FAIL)
        .text(
          data.dictamen
            ? "DICTAMEN: CUMPLE con las especificaciones"
            : "DICTAMEN: NO CUMPLE con las especificaciones",
          { align: "center" },
        );

      // Pie de trazabilidad
      doc.moveDown(1);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLOR_MUTED)
        .text(
          `Trazabilidad — Certificado ${data.numero} | Lote ${data.lote.numeroLote} | ` +
            `Inspecciones: ${data.inspeccionesConsolidadas
              .map((i) => `${i.secuencia}${i.esFicticia ? "*" : ""}`)
              .join(", ")} | ` +
            `Emisor: ${data.usuarioEmisor} | Generado: ${formatDate(
              data.fechaEmision,
            )}`,
          { align: "center" },
        );
      doc
        .fontSize(7)
        .text(
          "(*) Inspección ficticia. Los valores de referencia usados son los del cliente cuando existen; en caso contrario se utiliza el rango internacional del parámetro.",
          { align: "center" },
        );

      doc.end();
    });
  }

  private renderInfoBlock(
    doc: InstanceType<typeof PDFDocument>,
    titulo: string,
    filas: Array<[string, string]>,
  ): void {
    doc.moveDown(0.6);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLOR_HEADER_BG)
      .text(titulo);
    doc.font("Helvetica").fontSize(9).fillColor("#000000");
    for (const [k, v] of filas) {
      doc.text(`${k}: `, { continued: true }).text(v || "—");
    }
  }

  private renderResultadosTable(
    doc: InstanceType<typeof PDFDocument>,
    filas: Array<{
      claveParametro: string;
      unidadMedida: string;
      valor: string;
      desviacion: string;
      rango: ParametroRango;
      dentroEspecificacion: boolean;
    }>,
  ): void {
    doc.moveDown(0.6);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLOR_HEADER_BG)
      .text("RESULTADOS DE ANÁLISIS");

    const headers = [
      "Parámetro",
      "Unidad",
      "Valor",
      "Rango aceptable",
      "Desviación",
      "Resultado",
    ];
    const widths = [100, 55, 60, 110, 60, 75];
    const startX = doc.x;
    let y = doc.y + 4;

    // Header row
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    doc.rect(startX, y, widths.reduce((a, b) => a + b, 0), 18).fill(COLOR_HEADER_BG);
    let x = startX + 4;
    headers.forEach((h, i) => {
      const w = widths[i] ?? 60;
      doc.fillColor("#ffffff").text(h, x, y + 5, { width: w - 6 });
      x += w;
    });
    y += 18;

    // Rows
    doc.font("Helvetica").fontSize(9);
    for (const f of filas) {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = doc.y;
      }
      const color = f.dentroEspecificacion ? "#000000" : COLOR_FAIL;
      const cells = [
        f.claveParametro,
        f.unidadMedida,
        f.valor,
        `${f.rango.limiteInferior} – ${f.rango.limiteSuperior}${
          f.rango.origen === "cliente" ? " (C)" : ""
        }`,
        f.desviacion,
        f.dentroEspecificacion ? "Cumple" : "No cumple",
      ];
      x = startX + 4;
      doc.fillColor(color);
      cells.forEach((c, i) => {
        const w = widths[i] ?? 60;
        doc.text(c, x, y + 3, { width: w - 6 });
        x += w;
      });
      y += 16;
      doc
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .moveTo(startX, y)
        .lineTo(startX + widths.reduce((a, b) => a + b, 0), y)
        .stroke();
    }

    doc.y = y + 6;
    doc.x = startX;
    doc.fillColor("#000000");
  }
}

interface PdfData {
  numero: string;
  fechaEmision: Date;
  cliente: {
    claveSap: string;
    nombre: string;
    rfc: string;
    domicilio: string;
    contactoNombre: string;
  };
  producto: { clave: string; nombre: string };
  lote: { numeroLote: string; fechaProduccion: Date };
  embarque: {
    numOrdenCompra: string;
    cantidadSolicitada: string;
    cantidadEntrega: string;
    numFactura: string;
    fechaEnvio: Date | null;
    fechaCaducidad: Date | null;
  };
  filas: Array<{
    claveParametro: string;
    nombreParametro: string;
    unidadMedida: string;
    valor: string;
    desviacion: string;
    rango: ParametroRango;
    dentroEspecificacion: boolean;
  }>;
  dictamen: boolean;
  inspeccionesConsolidadas: Array<{
    secuencia: string;
    esFicticia: boolean;
    fechaInspeccion: Date;
  }>;
  usuarioEmisor: string;
}

export const certificadoPdfService = new CertificadoPdfService();
