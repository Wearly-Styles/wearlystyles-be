export interface DashboardMetricsQueryDTO {
  days?: number
}

export type DashboardSeriesPoint = {
  date: string
  count: number
}

export type DashboardUserGrowthPoint = {
  date: string
  total: number
  newUsers: number
}

export type DashboardMetricsResponse = {
  range: {
    from: string
    toExclusive: string
    days: number
  }
  totals: {
    users: number
    activeUsers: number
    posts: number
    comments: number
  }
  today: {
    newUsers: number
    activeUsers: number
    posts: number
    comments: number
    likes: number
  }
  todayChange: {
    newUsersPct: number | null
    postsPct: number | null
    likesPct: number | null
    commentsPct: number | null
  }
  charts: {
    userGrowth: DashboardUserGrowthPoint[]
    postsPerDay: DashboardSeriesPoint[]
  }
}

