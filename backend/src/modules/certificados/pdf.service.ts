import { promises as fs } from "node:fs";
import { createWriteStream } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../domain/errors.js";

export interface ParametroRango {
  limiteInferior: string;
  limiteSuperior: string;
  origen: "cliente" | "internacional";
}

export interface ResultadoConsolidado {
  parametroId: bigint;
  claveParametro: string;
  nombreParametro: string;
  unidadMedida: string;
  valor: string;
  desviacion: string;
  dentroEspecificacion: boolean;
  rango: ParametroRango;
}

interface InspeccionConsolidableResultado {
  parametroId: bigint;
  valor: { toString(): string };
  parametro: {
    clave: string;
    nombre: string;
    unidadMedida: string;
    limiteInferior: { toString(): string };
    limiteSuperior: { toString(): string };
  };
}

interface InspeccionConsolidable {
  secuencia: string;
  resultados: InspeccionConsolidableResultado[];
}

interface ValorReferenciaParticular {
  parametroId: bigint;
  limiteInferior: { toString(): string };
  limiteSuperior: { toString(): string };
}

export function consolidarResultados(
  inspecciones: InspeccionConsolidable[],
  valoresReferenciaCliente: ValorReferenciaParticular[],
): ResultadoConsolidado[] {
  const rangoCliente = new Map(
    valoresReferenciaCliente.map((vr) => [vr.parametroId.toString(), vr]),
  );

  const inspeccionesOrdenadas = [...inspecciones].sort((a, b) =>
    a.secuencia.localeCompare(b.secuencia),
  );

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

      const valorNum = Number(r.valor.toString());
      const lo = Number(rango.limiteInferior);
      const hi = Number(rango.limiteSuperior);
      const dentro = valorNum >= lo && valorNum <= hi;
      const midpoint = (lo + hi) / 2;
      const desviacionRango = valorNum - midpoint;

      consolidados.set(pid, {
        parametroId: r.parametroId,
        claveParametro: r.parametro.clave,
        nombreParametro: r.parametro.nombre,
        unidadMedida: r.parametro.unidadMedida,
        valor: formatDecimal(r.valor, 4),
        desviacion: Number.isFinite(desviacionRango)
          ? formatDecimal(desviacionRango, 4)
          : "—",
        dentroEspecificacion: dentro,
        rango,
      });
    }
  }

  return Array.from(consolidados.values()).sort((a, b) =>
    a.claveParametro.localeCompare(b.claveParametro),
  );
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

const SUPERSCRIPT_DIGIT_MAP: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

function convertirSecuenciaSuperindice(sequence: string): string {
  let sign = "";
  let digits = sequence;

  if (sequence.startsWith("⁻")) {
    sign = "-";
    digits = sequence.slice(1);
  } else if (sequence.startsWith("⁺")) {
    sign = "+";
    digits = sequence.slice(1);
  }

  const asciiDigits = digits.replace(
    /[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,
    (ch) => SUPERSCRIPT_DIGIT_MAP[ch] ?? ch,
  );

  return `^${sign}${asciiDigits}`;
}

function sanitizarParaHelvetica(text: string): string {
  return text
    .replace(/[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (sequence) =>
      convertirSecuenciaSuperindice(sequence),
    )
    // Handle standalone superscript signs not followed by digits (first pass
    // only matches signs that precede at least one superscript digit).
    .replace(/[⁻⁺]/g, (ch) => (ch === "⁻" ? "-" : "+"));
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

    const inspecciones = cert.certificadoInspeccion.map((ci) => ci.inspeccion);
    const filas = consolidarResultados(
      inspecciones,
      cert.cliente.valoresReferencia,
    );
    const inspeccionesOrdenadas = [...inspecciones].sort((a, b) =>
      a.secuencia.localeCompare(b.secuencia),
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
        direccionEnvio: cert.direccionEnvio ?? "—",
        fechaEnvio: cert.fechaEnvio,
        fechaCaducidad: cert.fechaCaducidad,
      },
      filas,
      dictamen: cumpleTodo,
      inspeccionesConsolidadas: inspeccionesOrdenadas.map((i) => ({
        secuencia: i.secuencia,
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

      const HEADER_TOP = 50;
      const HEADER_HEIGHT = 48;
      const HEADER_CONTENT_GAP = 22;

      doc.font("Helvetica");

      // Header
      doc
        .rect(60, HEADER_TOP, doc.page.width - 120, HEADER_HEIGHT)
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

      doc.x = doc.page.margins.left;
      doc.y = HEADER_TOP + HEADER_HEIGHT + HEADER_CONTENT_GAP;
      doc
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("CERTIFICADO DE CALIDAD", {
          align: "center",
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        });
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
        ["Dirección de envío", data.embarque.direccionEnvio],
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
              .map((i) => i.secuencia)
              .join(", ")} | ` +
            `Emisor: ${data.usuarioEmisor} | Generado: ${formatDate(
              data.fechaEmision,
            )}`,
          { align: "center" },
        );
      doc
        .fontSize(7)
        .text(
          "Los valores de referencia usados son los del cliente cuando existen; en caso contrario se utiliza el rango internacional del parámetro.",
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
    const widths = [65, 115, 55, 110, 60, 85];
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    const startX = doc.x;
    let y = doc.y + 4;

    // Header row
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    doc.rect(startX, y, totalWidth, 18).fill(COLOR_HEADER_BG);
    let x = startX + 4;
    headers.forEach((h, i) => {
      const w = widths[i] ?? 60;
      doc.fillColor("#ffffff").text(h, x, y + 5, {
        width: w - 6,
        lineBreak: false,
      });
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
        sanitizarParaHelvetica(f.claveParametro),
        sanitizarParaHelvetica(f.unidadMedida),
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
        doc.text(c, x, y + 3, {
          width: w - 6,
          lineBreak: false,
          ellipsis: true,
        });
        x += w;
      });
      y += 16;
      doc
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .moveTo(startX, y)
        .lineTo(startX + totalWidth, y)
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
    direccionEnvio: string;
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
    fechaInspeccion: Date;
  }>;
  usuarioEmisor: string;
}

export const certificadoPdfService = new CertificadoPdfService();
