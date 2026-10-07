import type { Weekday } from './types'

const WEEKDAY_BY_INDEX: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(total: number) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Suma días a una fecha YYYY-MM-DD sin depender de la zona horaria del navegador. */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number)
  const value = new Date(Date.UTC(y, m - 1, d + days))
  return value.toISOString().slice(0, 10)
}

export function weekdayOf(date: string): Weekday {
  const [y, m, d] = date.split('-').map(Number)
  return WEEKDAY_BY_INDEX[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** Fecha (YYYY-MM-DD) y minutos del día "ahora" en la zona horaria indicada. */
export function nowInTimezone(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

export function formatDate(date: string, locale: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(locale, { ...options, timeZone: 'UTC' })
}

export function formatPrice(price: number, locale: string, currency: string) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: price % 1 === 0 ? 0 : 2 }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}min`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`
}

export function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
