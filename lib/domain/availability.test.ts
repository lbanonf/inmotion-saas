import { describe, expect, it } from 'vitest'
import { computeAvailability, slotKey, slotKeysFor } from './availability'
import { DEFAULT_SETTINGS } from './defaults'
import { addDays, nowInTimezone, weekdayOf } from './time'
import type { BookingSettings } from './types'

const closed = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }

const settings: BookingSettings = {
  ...DEFAULT_SETTINGS,
  timezone: 'America/Lima',
  slotIntervalMinutes: 30,
  bookingWindowDays: 7,
  minNoticeMinutes: 120,
  weeklyHours: { ...closed, wed: [{ start: '09:00', end: '12:00' }], thu: [{ start: '09:00', end: '11:00' }, { start: '15:00', end: '16:00' }] },
}

// Miércoles 7 oct 2026, 08:00 en Lima (UTC-5).
const now = new Date('2026-10-07T13:00:00Z')

describe('time helpers', () => {
  it('resuelve fecha y hora local en la zona del negocio', () => {
    expect(nowInTimezone('America/Lima', now)).toEqual({ date: '2026-10-07', minutes: 8 * 60 })
    expect(nowInTimezone('Asia/Tokyo', now).date).toBe('2026-10-07')
  })

  it('suma días y obtiene el día de semana sin depender del huso del navegador', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(weekdayOf('2026-10-07')).toBe('wed')
  })
})

describe('slotKeysFor', () => {
  it('ocupa tantos bloques como cubra la duración (redondeando hacia arriba)', () => {
    expect(slotKeysFor('p1', '2026-10-07', '10:00', 75, 30)).toEqual([
      slotKey('p1', '2026-10-07', '10:00'),
      slotKey('p1', '2026-10-07', '10:30'),
      slotKey('p1', '2026-10-07', '11:00'),
    ])
  })
})

describe('computeAvailability', () => {
  it('respeta horario, duración y antelación mínima', () => {
    const days = computeAvailability({ settings, service: { durationMinutes: 60 }, professionalId: 'p1', takenKeys: new Set(), now })
    expect(days).toEqual([
      // Hoy: antes de las 10:00 no se puede (08:00 + 120 min); el último inicio es 11:00 (cierra 12:00).
      { date: '2026-10-07', slots: ['10:00', '10:30', '11:00'] },
      { date: '2026-10-08', slots: ['09:00', '09:30', '10:00', '15:00'] },
    ])
  })

  it('excluye horarios que se solapan con bloques ocupados', () => {
    const takenKeys = new Set([slotKey('p1', '2026-10-08', '09:30')])
    const days = computeAvailability({ settings, service: { durationMinutes: 60 }, professionalId: 'p1', takenKeys, now })
    expect(days.find((day) => day.date === '2026-10-08')?.slots).toEqual(['10:00', '15:00'])
  })

  it('los bloqueos de otro profesional no afectan', () => {
    const takenKeys = new Set([slotKey('p2', '2026-10-08', '09:00')])
    const days = computeAvailability({ settings, service: { durationMinutes: 60 }, professionalId: 'p1', takenKeys, now })
    expect(days.find((day) => day.date === '2026-10-08')?.slots[0]).toBe('09:00')
  })

  it('usa el horario propio del profesional si lo tiene', () => {
    const professionalHours = { ...closed, thu: [{ start: '15:00', end: '16:00' }] }
    const days = computeAvailability({ settings, service: { durationMinutes: 60 }, professionalId: 'p1', professionalHours, takenKeys: new Set(), now })
    expect(days).toEqual([{ date: '2026-10-08', slots: ['15:00'] }])
  })

  it('no ofrece días fuera de la ventana de reserva', () => {
    const days = computeAvailability({ settings: { ...settings, bookingWindowDays: 1 }, service: { durationMinutes: 30 }, professionalId: 'p1', takenKeys: new Set(), now })
    expect(days.map((day) => day.date)).toEqual(['2026-10-07'])
  })
})
