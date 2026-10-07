import { formatDuration, formatPrice } from './time'
import { WEEKDAYS, type Faq, type Product, type Professional, type Service, type Tenant, type Weekday } from './types'

const dayNames: Record<Weekday, string> = { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' }

export function normalizeText(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim()
}

const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'a', 'en', 'un', 'una', 'mi', 'me', 'es', 'por', 'para', 'con', 'se', 'lo', 'su', 'hola', 'tienen', 'hay', 'como', 'cual', 'cuales', 'puedo', 'quiero'])

function tokens(text: string) {
  return normalizeText(text).split(' ').filter((word) => word.length > 2 && !STOPWORDS.has(word))
}

/**
 * Busca la pregunta frecuente que mejor responde un mensaje.
 * Coincidencia simple por palabras clave: sirve de vista previa y de respaldo
 * cuando el bot con IA no está disponible.
 */
export function matchFaq(message: string, faqs: Faq[]): { faq: Faq; score: number } | null {
  const text = normalizeText(message)
  const words = new Set(tokens(message))
  let best: { faq: Faq; score: number } | null = null
  for (const faq of faqs.filter((item) => item.active)) {
    let score = 0
    for (const keyword of faq.keywords) {
      const normalized = normalizeText(keyword)
      if (normalized && text.includes(normalized)) score += 3
    }
    for (const word of tokens(faq.question)) if (words.has(word)) score += 1
    if (score > 0 && (!best || score > best.score)) best = { faq, score }
  }
  return best && best.score >= 2 ? best : null
}

type KnowledgeInput = {
  tenant: Tenant
  services: Service[]
  professionals: Professional[]
  products: Product[]
  faqs: Faq[]
  bookingUrl?: string
}

function hoursText(hours: Tenant['settings']['weeklyHours']) {
  return WEEKDAYS.map((day) => `${dayNames[day]}: ${hours[day].length ? hours[day].map((range) => `${range.start}–${range.end}`).join(', ') : 'cerrado'}`).join('\n')
}

/**
 * Instrucciones de sistema para un bot con IA (WhatsApp/Instagram/web),
 * generadas a partir de los datos reales del negocio. Al cambiar servicios,
 * precios, horarios o FAQs en el panel, el bot queda actualizado.
 */
export function buildAssistantPrompt({ tenant, services, professionals, products, faqs, bookingUrl }: KnowledgeInput) {
  const { profile, settings, assistant } = tenant
  const price = (value: number) => formatPrice(value, settings.locale, settings.currency)
  const lines = [
    `Eres ${assistant.name}, el asistente virtual de ${profile.name}${profile.location ? ` (${profile.location})` : ''}.`,
    `Tono: ${assistant.tone}`,
    `Saludo inicial: "${assistant.greeting}"`,
    '',
    '## Reglas',
    '- Responde solo con la información de este documento. Si no sabes algo, no lo inventes.',
    '- Los precios son referenciales ("desde"); el precio final se define tras el diagnóstico.',
    `- Para reservar, comparte el enlace de reservas${bookingUrl ? ` (${bookingUrl})` : ''} o pide servicio, fecha y hora preferida.`,
    `- Si la persona tiene una queja, un caso delicado o pide hablar con alguien, responde: "${assistant.handoffMessage}" y deriva la conversación.`,
    '',
    '## Negocio',
    profile.description,
    [profile.address && `Dirección: ${profile.address}`, profile.phone && `Teléfono/WhatsApp: ${profile.phone}`, profile.instagram && `Instagram: @${profile.instagram}`, profile.email && `Correo: ${profile.email}`].filter(Boolean).join('\n'),
    '',
    '## Horario de atención',
    hoursText(settings.weeklyHours),
    '',
    '## Servicios',
    ...services.filter((item) => item.active).map((item) => `- ${item.name}: ${price(item.price)} · ${formatDuration(item.durationMinutes)}${item.description ? ` · ${item.description}` : ''}`),
    '',
    '## Equipo',
    ...professionals.filter((item) => item.active).map((item) => `- ${item.name} (${item.role})${item.bio ? `: ${item.bio}` : ''}${item.weeklyHours ? `\n  Horario propio:\n  ${hoursText(item.weeklyHours).replace(/\n/g, '\n  ')}` : ''}`),
  ]
  const activeProducts = products.filter((item) => item.active)
  if (activeProducts.length) lines.push('', '## Productos a la venta', ...activeProducts.map((item) => `- ${item.name}${item.brand ? ` (${item.brand})` : ''}: ${price(item.price)}${item.stock <= 0 ? ' · agotado' : ''}`))
  const activeFaqs = faqs.filter((item) => item.active)
  if (activeFaqs.length) lines.push('', '## Preguntas frecuentes (respuestas aprobadas por el negocio)', ...activeFaqs.map((item) => `P: ${item.question}\nR: ${item.answer}`))
  return lines.filter((line) => line !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
