export type NyseSession = 'open' | 'pre-market' | 'after-hours' | 'closed' | 'holiday'

interface NewYorkTime {
  year: number
  month: number
  day: number
  weekday: string
  minutes: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function newYorkTime(date: Date): NewYorkTime {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date).map(part => [part.type, part.value])
  )

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: values.weekday,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  }
}

function nthWeekday(year: number, month: number, weekday: number, nth: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  return 1 + ((7 + weekday - firstWeekday) % 7) + (nth - 1) * 7
}

function lastWeekday(year: number, month: number, weekday: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0))
  return lastDay.getUTCDate() - ((7 + lastDay.getUTCDay() - weekday) % 7)
}

function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

function observedFixedHoliday(year: number, month: number, day: number): string {
  const holiday = new Date(Date.UTC(year, month - 1, day))
  const weekday = holiday.getUTCDay()
  if (weekday === 6) holiday.setUTCDate(holiday.getUTCDate() - 1)
  if (weekday === 0) holiday.setUTCDate(holiday.getUTCDate() + 1)
  return holiday.toISOString().slice(0, 10)
}

function isNyseHoliday(year: number, month: number, day: number): boolean {
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const goodFriday = easterSunday(year)
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2)

  const holidays = new Set([
    observedFixedHoliday(year, 1, 1),
    observedFixedHoliday(year + 1, 1, 1),
    `${year}-01-${String(nthWeekday(year, 1, 1, 3)).padStart(2, '0')}`,
    `${year}-02-${String(nthWeekday(year, 2, 1, 3)).padStart(2, '0')}`,
    goodFriday.toISOString().slice(0, 10),
    `${year}-05-${String(lastWeekday(year, 5, 1)).padStart(2, '0')}`,
    observedFixedHoliday(year, 6, 19),
    observedFixedHoliday(year, 7, 4),
    `${year}-09-${String(nthWeekday(year, 9, 1, 1)).padStart(2, '0')}`,
    `${year}-11-${String(nthWeekday(year, 11, 4, 4)).padStart(2, '0')}`,
    observedFixedHoliday(year, 12, 25),
  ])

  return holidays.has(iso)
}

export function getNyseSession(date = new Date()): NyseSession {
  const ny = newYorkTime(date)
  const weekday = WEEKDAYS.indexOf(ny.weekday)
  if (weekday <= 0 || weekday >= 6) return 'closed'
  if (isNyseHoliday(ny.year, ny.month, ny.day)) return 'holiday'
  if (ny.minutes >= 9 * 60 + 30 && ny.minutes < 16 * 60) return 'open'
  if (ny.minutes >= 4 * 60 && ny.minutes < 9 * 60 + 30) return 'pre-market'
  if (ny.minutes >= 16 * 60 && ny.minutes < 20 * 60) return 'after-hours'
  return 'closed'
}
