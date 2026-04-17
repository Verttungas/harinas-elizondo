import type { Prisma, PrismaClient } from "@prisma/client";

export type PrismaLike = PrismaClient | Prisma.TransactionClient;

export interface AuditLogParams {
  usuarioId: bigint;
  entidad: string;
  entidadId: bigint;
  accion: string;
  detalle?: unknown;
}

export async function auditLog(
  db: PrismaLike,
  params: AuditLogParams,
): Promise<void> {
  await db.bitacora.create({
    data: {
      usuarioId: params.usuarioId,
      entidad: params.entidad,
      entidadId: params.entidadId,
      accion: params.accion,
      detalle:
        params.detalle === undefined
          ? undefined
          : (params.detalle as Prisma.InputJsonValue),
    },
  });
}
