export interface WeatherQueryDTO {
  lat: number
  lon: number
  datetime?: string
}

export interface CalendarQueryDTO {
  accessToken: string
  timeMin?: string
  timeMax?: string
  maxResults?: number
}

export interface NormalizedWeather {
  tempC: number | null
  conditionCode: number | null
  rainProbability: number
  humidity: number | null
  tags: string[]
  source: string
  observedAt: string
}

export interface NormalizedEvent {
  id?: string
  title: string
  start?: string
  end?: string
  location?: string
  eventType: string
  dressCode: string
  timeOfDay: string
}

export interface NormalizedClosetItem {
  id: number
  name?: string
  category?: string
  color?: string
  image?: string
  season?: string
  material?: string
  isFavorite?: boolean
  tags: string[]
}
