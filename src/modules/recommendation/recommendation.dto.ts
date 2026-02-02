import type { NormalizedClosetItem, NormalizedEvent, NormalizedWeather } from "@modules/context/context.dto"

export interface RecommendationContextDTO {
  weather?: NormalizedWeather
  calendar?: NormalizedEvent[]
  closet: NormalizedClosetItem[]
  preferences?: string[]
  selectedEventType?: string
  selectedStyle?: string
}

export interface OutfitRecommendation {
  eventId?: string
  eventTitle?: string
  eventType?: string
  style?: string
  items: number[]
  notes: string[]
}

export interface RecommendationResponse {
  primary: OutfitRecommendation
  alternatives: OutfitRecommendation[]
  recommendations?: OutfitRecommendation[]
  model: string
}
