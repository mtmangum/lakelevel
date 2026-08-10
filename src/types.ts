export interface DailyReading {
  date: string       // YYYY-MM-DD
  year: number
  month: number
  day: number
  waterLevel: number
  percentFull: number
  storage: number
}

export interface Point { x: number; y: number }

export interface CubicSegment {
  c1: Point
  c2: Point
  end: Point
}
