import type { NormalizedClosetItem, NormalizedEvent, NormalizedWeather } from "@modules/context/context.dto"

export interface RecommendationContextDTO {
  weather?: NormalizedWeather
  calendar?: NormalizedEvent[]
  closet: NormalizedClosetItem[]
  preferences?: string[]
  selectedEventType?: string
  selectedStyle?: string
  includeAlternatives?: boolean
  alternativesCount?: number
}

export interface OutfitRecommendation {
  outfit: {
    name: string
    items: NormalizedClosetItem[]
  }
  eventId?: string
  eventTitle?: string
  eventType?: string
  style?: string
  items: number[]
  notes: string[]
  missingItems?: MissingItem[]
}

export interface MissingItem {
  name: string
  category?: string
  reason?: string
}

export interface RecommendationResponse {
  primary: OutfitRecommendation
  alternatives: OutfitRecommendation[]
  recommendations?: OutfitRecommendation[]
  model: string
}
