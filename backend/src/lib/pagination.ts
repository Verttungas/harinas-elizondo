export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

export function parsePaginationQuery(query: {
  page?: number | string;
  limit?: number | string;
}): PaginationParams {
  const pageRaw = query.page;
  const limitRaw = query.limit;

  let page =
    typeof pageRaw === "number" ? pageRaw : pageRaw ? Number(pageRaw) : DEFAULT_PAGE;
  let limit =
    typeof limitRaw === "number" ? limitRaw : limitRaw ? Number(limitRaw) : DEFAULT_LIMIT;

  if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;
  if (!Number.isFinite(limit) || limit < MIN_LIMIT) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  page = Math.trunc(page);
  limit = Math.trunc(limit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResponse<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data,
    pagination: { page, limit, total, totalPages },
  };
}
