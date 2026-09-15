export type PaginationParams = { page?: number; limit?: number };
export type PaginationResult = { page: number; limit: number; skip: number };

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export function buildPagination({ page = 1, limit = DEFAULT_LIMIT }: PaginationParams): PaginationResult {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function paginatedResponse<T>(items: T[], total: number, { page, limit }: PaginationResult) {
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
