import { WEEKDAYS, type AssistantSettings, type BookingSettings, type BusinessProfile, type WeeklyHours } from './types'

const workday = [{ start: '09:00', end: '19:00' }]

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: workday,
  tue: workday,
  wed: workday,
  thu: workday,
  fri: workday,
  sat: [{ start: '09:00', end: '14:00' }],
  sun: [],
}

export const DEFAULT_SETTINGS: BookingSettings = {
  timezone: 'America/Lima',
  locale: 'es-PE',
  currency: 'PEN',
  slotIntervalMinutes: 30,
  bookingWindowDays: 21,
  minNoticeMinutes: 120,
  weeklyHours: DEFAULT_WEEKLY_HOURS,
}

export const DEFAULT_PROFILE: BusinessProfile = {
  name: 'Mi negocio',
  eyebrow: 'Reservas online',
  headline: 'Reserva tu cita en minutos.',
  description: '',
  logo: '',
  location: '',
  address: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  email: '',
  accent: '#8f6d5b',
  accentSoft: '#eee4dc',
  surface: '#242622',
}

export const DEFAULT_ASSISTANT: AssistantSettings = {
  enabled: false,
  name: 'Asistente',
  tone: 'Cercano, cálido y profesional. Responde en español, tutea, frases cortas y emojis suaves.',
  greeting: '¡Hola! ¿En qué te puedo ayudar?',
  handoffMessage: 'Te comunico con una persona del equipo para ayudarte mejor.',
}

type Loose = Record<string, unknown> | undefined

function str(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Completa un perfil parcial (p. ej. leído de la base de datos) con valores por defecto. */
export function normalizeProfile(raw: Loose): BusinessProfile {
  const data = raw ?? {}
  return Object.fromEntries(
    Object.entries(DEFAULT_PROFILE).map(([key, fallback]) => [key, str(data[key], fallback)]),
  ) as BusinessProfile
}

export function normalizeSettings(raw: Loose): BookingSettings {
  const data = raw ?? {}
  const hours = (data.weeklyHours ?? {}) as Partial<WeeklyHours>
  return {
    timezone: str(data.timezone, DEFAULT_SETTINGS.timezone),
    locale: str(data.locale, DEFAULT_SETTINGS.locale),
    currency: str(data.currency, DEFAULT_SETTINGS.currency),
    slotIntervalMinutes: num(data.slotIntervalMinutes, DEFAULT_SETTINGS.slotIntervalMinutes),
    bookingWindowDays: num(data.bookingWindowDays, DEFAULT_SETTINGS.bookingWindowDays),
    minNoticeMinutes: num(data.minNoticeMinutes, DEFAULT_SETTINGS.minNoticeMinutes),
    weeklyHours: Object.fromEntries(
      WEEKDAYS.map((day) => [day, Array.isArray(hours[day]) ? hours[day] : DEFAULT_WEEKLY_HOURS[day]]),
    ) as WeeklyHours,
  }
}

export function normalizeAssistant(raw: Loose): AssistantSettings {
  const data = raw ?? {}
  return {
    enabled: data.enabled === true,
    name: str(data.name, DEFAULT_ASSISTANT.name),
    tone: str(data.tone, DEFAULT_ASSISTANT.tone),
    greeting: str(data.greeting, DEFAULT_ASSISTANT.greeting),
    handoffMessage: str(data.handoffMessage, DEFAULT_ASSISTANT.handoffMessage),
  }
}

/** Horario semanal válido o null (usa el del negocio). */
export function normalizeWeeklyHours(raw: unknown): WeeklyHours | null {
  if (!raw || typeof raw !== 'object') return null
  const hours = raw as Partial<WeeklyHours>
  return Object.fromEntries(WEEKDAYS.map((day) => [day, Array.isArray(hours[day]) ? hours[day] : []])) as WeeklyHours
}
