import type { PrismaLike } from "../../lib/audit.js";

export async function generarNumeroCertificado(db: PrismaLike): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CERT-${year}-`;

  const count = await db.certificado.count({
    where: { numero: { startsWith: prefix } },
  });

  const consecutivo = (count + 1).toString().padStart(6, "0");
  return `${prefix}${consecutivo}`;
}
