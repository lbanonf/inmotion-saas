import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './defaults'
import { busyMinutesWithin, dayLoad, startOfWeek, workingRanges } from './schedule'
import type { Appointment, Professional, TimeBlock } from './types'

const closed = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
const settings = { ...DEFAULT_SETTINGS, weeklyHours: { ...closed, wed: [{ start: '10:00', end: '14:00' }] } }
const pro: Professional = { id: 'p1', name: 'Ana', role: '', bio: '', instagram: '', active: true, order: 1, serviceIds: [], weeklyHours: null }
const appt = (time: string, duration: number, status: Appointment['status'] = 'approved'): Appointment => ({
  id: time, serviceId: 's', serviceName: 'S', durationMinutes: duration, price: 0, professionalId: 'p1', professionalName: 'Ana',
  date: '2026-10-07', time, contact: { name: '', email: '', phone: '' }, notes: '', status, source: 'web', slotKeys: [], createdAt: null,
})

describe('schedule', () => {
  it('usa el horario propio del profesional si existe', () => {
    expect(workingRanges(pro, settings, '2026-10-07')).toEqual([{ start: '10:00', end: '14:00' }])
    expect(workingRanges({ weeklyHours: { ...closed, wed: [{ start: '15:00', end: '16:00' }] } }, settings, '2026-10-07')).toEqual([{ start: '15:00', end: '16:00' }])
  })

  it('calcula ocupación con citas activas y bloqueos, sin contar solapes ni canceladas', () => {
    const block: TimeBlock = { id: 'b', professionalId: 'p1', date: '2026-10-07', start: '13:00', end: '15:00', reason: 'Almuerzo', slotKeys: [] }
    const load = dayLoad(pro, settings, '2026-10-07', [appt('10:00', 60), appt('10:30', 60), appt('12:00', 60, 'cancelled')], [block])
    // 10:00–11:30 ocupado (90) + bloqueo 13:00–14:00 dentro del horario (60) = 150 de 240
    expect(load).toEqual({ workMinutes: 240, busyMinutes: 150, appointments: 2, occupancy: 63 })
  })

  it('no cuenta nada fuera del horario', () => {
    expect(busyMinutesWithin([{ kind: 'block', start: 0, end: 60, block: {} as TimeBlock }], [{ start: '10:00', end: '11:00' }])).toBe(0)
  })

  it('la semana empieza el lunes', () => {
    expect(startOfWeek('2026-10-07')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
  })
})
