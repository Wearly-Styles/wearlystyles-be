import { prisma } from "@modules/prisma"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import type {
  DashboardMetricsResponse,
  DashboardSeriesPoint,
  DashboardUserGrowthPoint,
} from "./dashboard.dto"

type DateCountRow = {
  date: string
  count: number
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const startOfDay = (value: Date) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const addDays = (value: Date, amount: number) => {
  const date = new Date(value)
  date.setDate(date.getDate() + amount)
  return date
}

const computePercentChange = (today: number, yesterday: number): number | null => {
  if (yesterday === 0) {
    return today === 0 ? 0 : null
  }
  return Math.round(((today - yesterday) / yesterday) * 100)
}

export class DashboardService {
  private async countActiveUsers(from: Date, toExclusive: Date): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM (
        SELECT user_id
        FROM posts
        WHERE user_id IS NOT NULL
          AND created_at IS NOT NULL
          AND created_at >= ${from}
          AND created_at < ${toExclusive}
        UNION
        SELECT user_id
        FROM comments
        WHERE user_id IS NOT NULL
          AND created_at IS NOT NULL
          AND created_at >= ${from}
          AND created_at < ${toExclusive}
        UNION
        SELECT user_id
        FROM likes
        WHERE user_id IS NOT NULL
          AND is_active IS TRUE
          AND created_at IS NOT NULL
          AND created_at >= ${from}
          AND created_at < ${toExclusive}
      ) active_users
    `

    return rows?.[0]?.count ?? 0
  }

  private async getUserDailyCounts(from: Date, toExclusive: Date): Promise<Record<string, number>> {
    const rows = await prisma.$queryRaw<DateCountRow[]>`
      SELECT
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count
      FROM users
      WHERE created_at IS NOT NULL
        AND created_at >= ${from}
        AND created_at < ${toExclusive}
      GROUP BY 1
      ORDER BY 1
    `

    return (rows || []).reduce<Record<string, number>>((acc, row) => {
      acc[row.date] = row.count
      return acc
    }, {})
  }

  private async getPostDailyCounts(from: Date, toExclusive: Date): Promise<Record<string, number>> {
    const rows = await prisma.$queryRaw<DateCountRow[]>`
      SELECT
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count
      FROM posts
      WHERE created_at IS NOT NULL
        AND created_at >= ${from}
        AND created_at < ${toExclusive}
      GROUP BY 1
      ORDER BY 1
    `

    return (rows || []).reduce<Record<string, number>>((acc, row) => {
      acc[row.date] = row.count
      return acc
    }, {})
  }

  async getMetrics(days = 7): Promise<DashboardMetricsResponse> {
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      throw new AppError(MESSAGES.BAD_REQUEST, 400, ErrorCode.BAD_REQUEST)
    }

    const now = new Date()
    const todayStart = startOfDay(now)
    const tomorrowStart = addDays(todayStart, 1)
    const from = addDays(todayStart, -(days - 1))
    const yesterdayStart = addDays(todayStart, -1)

    const [totalUsers, totalPosts, totalComments] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
    ])

    const [
      newUsersToday,
      postsToday,
      commentsToday,
      likesToday,
      newUsersYesterday,
      postsYesterday,
      commentsYesterday,
      likesYesterday,
      activeUsersRange,
      activeUsersToday,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.post.count({ where: { createdAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.comment.count({ where: { createdAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.like.count({
        where: { createdAt: { gte: todayStart, lt: tomorrowStart }, isActive: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.post.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.comment.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.like.count({
        where: { createdAt: { gte: yesterdayStart, lt: todayStart }, isActive: true },
      }),
      this.countActiveUsers(from, tomorrowStart),
      this.countActiveUsers(todayStart, tomorrowStart),
    ])

    const [usersByDay, postsByDay, totalUsersBeforeFrom] = await Promise.all([
      this.getUserDailyCounts(from, tomorrowStart),
      this.getPostDailyCounts(from, tomorrowStart),
      prisma.user.count({ where: { createdAt: { lt: from } } }),
    ])

    let cumulativeUsers = totalUsersBeforeFrom
    const userGrowth: DashboardUserGrowthPoint[] = []
    const postsPerDay: DashboardSeriesPoint[] = []
    for (let index = 0; index < days; index += 1) {
      const date = addDays(from, index)
      const key = formatDateKey(date)
      const createdUsers = usersByDay[key] ?? 0
      const createdPosts = postsByDay[key] ?? 0
      cumulativeUsers += createdUsers
      userGrowth.push({ date: key, total: cumulativeUsers, newUsers: createdUsers })
      postsPerDay.push({ date: key, count: createdPosts })
    }

    return {
      range: {
        from: from.toISOString(),
        toExclusive: tomorrowStart.toISOString(),
        days,
      },
      totals: {
        users: totalUsers,
        activeUsers: activeUsersRange,
        posts: totalPosts,
        comments: totalComments,
      },
      today: {
        newUsers: newUsersToday,
        activeUsers: activeUsersToday,
        posts: postsToday,
        comments: commentsToday,
        likes: likesToday,
      },
      todayChange: {
        newUsersPct: computePercentChange(newUsersToday, newUsersYesterday),
        postsPct: computePercentChange(postsToday, postsYesterday),
        likesPct: computePercentChange(likesToday, likesYesterday),
        commentsPct: computePercentChange(commentsToday, commentsYesterday),
      },
      charts: {
        userGrowth,
        postsPerDay,
      },
    }
  }
}
