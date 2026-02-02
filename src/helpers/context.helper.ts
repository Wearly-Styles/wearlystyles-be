const normalizeText = (value?: string | null) => (value || "").toLowerCase()

const hasAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword))

export const getTimeOfDay = (isoDate?: string | null): string => {
  if (!isoDate) {
    return "unknown"
  }

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return "unknown"
  }

  const hour = date.getHours()
  if (hour >= 5 && hour <= 11) return "morning"
  if (hour >= 12 && hour <= 16) return "afternoon"
  if (hour >= 17 && hour <= 20) return "evening"
  return "night"
}

export const mapEventType = (title?: string | null, description?: string | null): string => {
  const text = `${normalizeText(title)} ${normalizeText(description)}`

  if (hasAny(text, ["interview", "meeting", "sync", "review", "presentation", "client"])) {
    return "formal_meeting"
  }
  if (hasAny(text, ["gym", "workout", "training", "yoga", "run"])) {
    return "gym"
  }
  if (hasAny(text, ["wedding", "gala", "ceremony", "award"])) {
    return "formal_event"
  }
  if (hasAny(text, ["party", "hangout", "brunch", "dinner", "date", "coffee"])) {
    return "casual_social"
  }
  if (hasAny(text, ["flight", "travel", "airport", "trip"])) {
    return "travel"
  }

  return "casual_social"
}

export const mapDressCode = (eventType: string): string => {
  switch (eventType) {
    case "formal_meeting":
    case "formal_event":
      return "formal"
    case "gym":
      return "athleisure"
    case "travel":
      return "comfortable"
    case "casual_social":
    default:
      return "smart_casual"
  }
}

export const buildWeatherTags = (params: {
  tempC?: number | null
  humidity?: number | null
  rainProbability?: number | null
  conditionCode?: number | null
}): string[] => {
  const tags = new Set<string>()
  const { tempC, humidity, rainProbability, conditionCode } = params

  if (typeof tempC === "number") {
    if (tempC >= 30) tags.add("hot")
    else if (tempC >= 24) tags.add("warm")
    else if (tempC >= 14) tags.add("cool")
    else tags.add("cold")
  }

  if (typeof humidity === "number" && humidity >= 70) {
    tags.add("humid")
  }

  if (typeof rainProbability === "number" && rainProbability >= 40) {
    tags.add("rain_possible")
  }

  if (typeof conditionCode === "number") {
    if (conditionCode >= 200 && conditionCode < 600) {
      tags.add("rainy")
    }
    if (conditionCode >= 600 && conditionCode < 700) {
      tags.add("snowy")
    }
    if (conditionCode >= 700 && conditionCode < 800) {
      tags.add("foggy")
    }
    if (conditionCode === 800) {
      tags.add("clear")
    }
  }

  return Array.from(tags)
}
