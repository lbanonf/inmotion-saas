import { addDays, minutesToTime, nowInTimezone, timeToMinutes, weekdayOf } from './time'
import type { BookingSettings, Professional, Service, WeeklyHours } from './types'

export type DayAvailability = {
  date: string
  slots: string[]
}

/** Clave única de un bloque de agenda. Se usa como id del documento de bloqueo. */
export function slotKey(professionalId: string, date: string, time: string) {
  return `${professionalId}_${date}_${time.replace(':', '')}`
}

/** Bloques de agenda que ocupa una cita de `durationMinutes` que empieza a `time`. */
export function slotKeysFor(professionalId: string, date: string, time: string, durationMinutes: number, intervalMinutes: number) {
  const start = timeToMinutes(time)
  const blocks = Math.max(1, Math.ceil(durationMinutes / intervalMinutes))
  return Array.from({ length: blocks }, (_, index) => slotKey(professionalId, date, minutesToTime(start + index * intervalMinutes)))
}

export function professionalCanDo(professional: Professional, serviceId: string) {
  return professional.serviceIds.length === 0 || professional.serviceIds.includes(serviceId)
}

type AvailabilityInput = {
  settings: BookingSettings
  service: Pick<Service, 'durationMinutes'>
  professionalId: string
  /** Horario propio del profesional; si no tiene, se usa el del negocio. */
  professionalHours?: WeeklyHours | null
  /** Ids de bloqueos ocupados (ver slotKey). */
  takenKeys: Set<string>
  now?: Date
}

/**
 * Calcula los días y horarios disponibles dentro de la ventana de reserva,
 * respetando horario semanal, antelación mínima y bloques ya ocupados.
 */
export function computeAvailability({ settings, service, professionalId, professionalHours, takenKeys, now = new Date() }: AvailabilityInput): DayAvailability[] {
  const interval = Math.max(5, settings.slotIntervalMinutes)
  const today = nowInTimezone(settings.timezone, now)
  const earliest = today.minutes + settings.minNoticeMinutes
  const days: DayAvailability[] = []

  for (let offset = 0; offset < settings.bookingWindowDays; offset++) {
    const date = addDays(today.date, offset)
    const ranges = (professionalHours ?? settings.weeklyHours)[weekdayOf(date)] ?? []
    const slots: string[] = []

    for (const range of ranges) {
      const end = timeToMinutes(range.end)
      for (let start = timeToMinutes(range.start); start + service.durationMinutes <= end; start += interval) {
        if (offset * 1440 + start < earliest) continue
        const time = minutesToTime(start)
        const keys = slotKeysFor(professionalId, date, time, service.durationMinutes, interval)
        if (keys.some((key) => takenKeys.has(key))) continue
        slots.push(time)
      }
    }

    if (slots.length > 0) days.push({ date, slots })
  }

  return days
}
