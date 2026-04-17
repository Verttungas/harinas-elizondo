import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.bigint({ invalid_type_error: "id inválido" }),
});

export const parametroParamsSchema = z.object({
  id: z.coerce.bigint({ invalid_type_error: "id inválido" }),
  paramId: z.coerce.bigint({ invalid_type_error: "paramId inválido" }),
});

export const valorReferenciaParamsSchema = z.object({
  id: z.coerce.bigint({ invalid_type_error: "id inválido" }),
  vrId: z.coerce.bigint({ invalid_type_error: "vrId inválido" }),
});

export type IdParam = z.infer<typeof idParamSchema>;
export type ParametroParams = z.infer<typeof parametroParamsSchema>;
export type ValorReferenciaParams = z.infer<typeof valorReferenciaParamsSchema>;
