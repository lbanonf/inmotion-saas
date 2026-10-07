// Modelo de dominio independiente del proveedor de datos.
// Nada en este archivo conoce Firebase: cualquier backend nuevo solo debe
// producir y consumir estos tipos (ver lib/data/repository.ts).

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** Rango horario en hora local del negocio, formato HH:mm. */
export type TimeRange = { start: string; end: string }

export type WeeklyHours = Record<Weekday, TimeRange[]>

export type BusinessProfile = {
  name: string
  /** Texto corto sobre el título, p. ej. "Color · Tratamientos · Styling". */
  eyebrow: string
  headline: string
  description: string
  /** Iniciales o texto corto para el logotipo. */
  logo: string
  location: string
  /** Dirección exacta (opcional). */
  address: string
  phone: string
  /** Número de WhatsApp en formato internacional, solo dígitos (ej. 51999999999). */
  whatsapp: string
  /** Usuario de Instagram sin @. */
  instagram: string
  email: string
  /** Color principal de marca (hex). */
  accent: string
  /** Variante suave del color de marca (hex). */
  accentSoft: string
  /** Color del panel lateral de la página de reservas (hex). */
  surface: string
}

export type BookingSettings = {
  /** Zona horaria IANA, p. ej. "America/Lima". */
  timezone: string
  /** Locale BCP 47, p. ej. "es-PE". */
  locale: string
  /** Moneda ISO 4217, p. ej. "PEN". */
  currency: string
  /** Granularidad de la agenda en minutos (15, 30, 60...). */
  slotIntervalMinutes: number
  /** Cuántos días hacia adelante se puede reservar. */
  bookingWindowDays: number
  /** Antelación mínima para reservar, en minutos. */
  minNoticeMinutes: number
  weeklyHours: WeeklyHours
}

export type AssistantSettings = {
  enabled: boolean
  /** Nombre con el que se presenta el asistente. */
  name: string
  /** Tono e instrucciones de estilo (ej. cercano, usa "tú", emojis suaves). */
  tone: string
  greeting: string
  /** Mensaje cuando debe derivar a una persona. */
  handoffMessage: string
}

export type Tenant = {
  id: string
  profile: BusinessProfile
  settings: BookingSettings
  assistant: AssistantSettings
  adminUids: string[]
  /** Correos con acceso de administrador (además de adminUids). */
  adminEmails: string[]
}

export type TenantInput = Omit<Tenant, 'id'>

export type Service = {
  id: string
  name: string
  description: string
  durationMinutes: number
  price: number
  active: boolean
  order: number
}

export type ServiceInput = Omit<Service, 'id'>

export type Professional = {
  id: string
  name: string
  role: string
  bio: string
  instagram: string
  active: boolean
  order: number
  /** Servicios que puede atender. Vacío = todos. */
  serviceIds: string[]
  /** Horario propio. null = usa el horario del negocio. */
  weeklyHours: WeeklyHours | null
}

export type ProfessionalInput = Omit<Professional, 'id'>

export type Product = {
  id: string
  name: string
  brand: string
  category: string
  description: string
  price: number
  stock: number
  active: boolean
  order: number
}

export type ProductInput = Omit<Product, 'id'>

/** Pregunta frecuente: base de conocimiento del asistente/bot. */
export type Faq = {
  id: string
  question: string
  answer: string
  /** Palabras clave para ayudar a encontrar la respuesta. */
  keywords: string[]
  active: boolean
  order: number
}

export type FaqInput = Omit<Faq, 'id'>

export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/** Estados que ocupan agenda. */
export const BLOCKING_STATUSES: AppointmentStatus[] = ['pending', 'approved']

export type AppointmentContact = {
  name: string
  email: string
  phone: string
}

export type AppointmentSource = 'web' | 'admin'

export type Appointment = {
  id: string
  serviceId: string
  serviceName: string
  durationMinutes: number
  price: number
  professionalId: string
  professionalName: string
  /** YYYY-MM-DD en hora local del negocio. */
  date: string
  /** HH:mm en hora local del negocio. */
  time: string
  contact: AppointmentContact
  notes: string
  status: AppointmentStatus
  source: AppointmentSource
  /** Claves de bloqueo de agenda que ocupa esta cita. */
  slotKeys: string[]
  createdAt: Date | null
}

export type CreateAppointmentInput = {
  service: Service
  professional: Professional
  date: string
  time: string
  contact: AppointmentContact
  notes?: string
  source: AppointmentSource
  slotIntervalMinutes: number
  /** Solo los administradores pueden crear citas ya aprobadas. */
  status?: Extract<AppointmentStatus, 'pending' | 'approved'>
}

/** Horario bloqueado de un profesional (almuerzo, ausencia, capacitación...). */
export type TimeBlock = {
  id: string
  professionalId: string
  date: string
  start: string
  end: string
  reason: string
  slotKeys: string[]
}

export type CreateTimeBlockInput = Omit<TimeBlock, 'id' | 'slotKeys'> & { slotIntervalMinutes: number }

/** Bloque de agenda ocupado. No contiene datos personales: es público. */
export type SlotLock = {
  id: string
  professionalId: string
  date: string
  time: string
}

export type AdminUser = {
  uid: string
  email: string | null
  displayName: string | null
}
