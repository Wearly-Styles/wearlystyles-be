export interface CreateOutfitHistoryDTO {
  outfitId: number
  note?: string
}

export interface OutfitHistoryQueryDTO {
  from?: string
  to?: string
}
