import type { PaginationQuery, PaginationMeta } from "@common/interfaces/pagination.interface"

export class PaginationHelper {
  static getPaginationParams(query: PaginationQuery) {
    const page = Math.max(1, Number.parseInt(String(query.page || 1), 10))
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit || 10), 10)))
    const skip = (page - 1) * limit

    return { page, limit, skip }
  }

  static buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }
}
