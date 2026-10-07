import { timeToMinutes, weekdayOf, addDays } from './time'
import { BLOCKING_STATUSES, type Appointment, type BookingSettings, type Professional, type TimeBlock, type TimeRange } from './types'

/** Tramos en que trabaja un profesional en una fecha (su horario propio o el del negocio). */
export function workingRanges(professional: Pick<Professional, 'weeklyHours'>, settings: BookingSettings, date: string): TimeRange[] {
  return (professional.weeklyHours ?? settings.weeklyHours)[weekdayOf(date)] ?? []
}

export function rangeMinutes(ranges: TimeRange[]) {
  return ranges.reduce((total, range) => total + Math.max(0, timeToMinutes(range.end) - timeToMinutes(range.start)), 0)
}

export type BusyItem =
  | { kind: 'appointment'; start: number; end: number; appointment: Appointment }
  | { kind: 'block'; start: number; end: number; block: TimeBlock }

/** Citas activas y bloqueos de un profesional en una fecha, en minutos del día, ordenados. */
export function busyItems(professionalId: string, date: string, appointments: Appointment[], blocks: TimeBlock[]): BusyItem[] {
  const items: BusyItem[] = [
    ...appointments
      .filter((item) => item.professionalId === professionalId && item.date === date && BLOCKING_STATUSES.includes(item.status))
      .map((appointment) => {
        const start = timeToMinutes(appointment.time)
        return { kind: 'appointment' as const, start, end: start + appointment.durationMinutes, appointment }
      }),
    ...blocks
      .filter((block) => block.professionalId === professionalId && block.date === date)
      .map((block) => ({ kind: 'block' as const, start: timeToMinutes(block.start), end: timeToMinutes(block.end), block })),
  ]
  return items.sort((a, b) => a.start - b.start)
}

/** Minutos ocupados dentro del horario de trabajo (sin contar solapes dos veces). */
export function busyMinutesWithin(items: BusyItem[], ranges: TimeRange[]) {
  let total = 0
  for (const range of ranges) {
    const rangeStart = timeToMinutes(range.start)
    const rangeEnd = timeToMinutes(range.end)
    let cursor = rangeStart
    for (const item of items) {
      const start = Math.max(item.start, cursor)
      const end = Math.min(item.end, rangeEnd)
      if (end > start) {
        total += end - start
        cursor = end
      }
    }
  }
  return total
}

export type DayLoad = { workMinutes: number; busyMinutes: number; appointments: number; occupancy: number }

export function dayLoad(professional: Professional, settings: BookingSettings, date: string, appointments: Appointment[], blocks: TimeBlock[]): DayLoad {
  const ranges = workingRanges(professional, settings, date)
  const items = busyItems(professional.id, date, appointments, blocks)
  const workMinutes = rangeMinutes(ranges)
  const busyMinutes = busyMinutesWithin(items, ranges)
  return {
    workMinutes,
    busyMinutes,
    appointments: items.filter((item) => item.kind === 'appointment').length,
    occupancy: workMinutes === 0 ? 0 : Math.round((busyMinutes / workMinutes) * 100),
  }
}

/** Lunes de la semana de una fecha (YYYY-MM-DD). */
export function startOfWeek(date: string) {
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  return addDays(date, -order.indexOf(weekdayOf(date)))
}
