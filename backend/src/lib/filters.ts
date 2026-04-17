export type TextSearchClause = {
  OR: Array<Record<string, { contains: string; mode: "insensitive" }>>;
};

export function buildTextSearch(
  q: string | undefined,
  fields: string[],
): TextSearchClause | undefined {
  if (!q || q.trim().length === 0 || fields.length === 0) return undefined;
  const term = q.trim();
  return {
    OR: fields.map((field) => ({
      [field]: { contains: term, mode: "insensitive" as const },
    })),
  };
}
