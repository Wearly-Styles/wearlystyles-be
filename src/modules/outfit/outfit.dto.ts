export interface CreateOutfitDTO {
  name?: string
  occasion?: string
  weather?: string
  isFavorite?: boolean
  items: number[]
}

export interface UpdateOutfitDTO {
  name?: string
  occasion?: string
  weather?: string
  isFavorite?: boolean
  items?: number[]
}
