export interface OutfitPlanItemDTO {
  outfitId: number
  planDate: string
  planType?: string
  reminderSent?: boolean
}

export interface OutfitPlanQueryDTO {
  from?: string
  to?: string
}

export interface UpdateOutfitPlanDTO {
  outfitId?: number
  planDate?: string
  planType?: string
  reminderSent?: boolean
}
