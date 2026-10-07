import { DEFAULT_ASSISTANT, DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/lib/domain/defaults'
import type { AssistantSettings, BookingSettings, BusinessProfile, FaqInput, ProductInput, ProfessionalInput, ServiceInput, WeeklyHours } from '@/lib/domain/types'

// Plantillas para inicializar un negocio desde /admin (o con `npm run seed`).
// Son un punto de partida: todo se edita luego en el panel.

export type TenantTemplate = {
  id: string
  label: string
  profile: BusinessProfile
  settings: BookingSettings
  assistant: AssistantSettings
  services: ServiceInput[]
  /** serviceIds se resuelven por índice de `services` al aplicar la plantilla. */
  professionals: (Omit<ProfessionalInput, 'serviceIds'> & { serviceIndexes: number[] })[]
  products: ProductInput[]
  faqs: FaqInput[]
}

const closed: WeeklyHours = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }

// ---------------------------------------------------------------------------
// In Motion · San Isidro (instagram.com/inmotionsalon.pe)
// Datos tomados del perfil público. Los precios, horarios, medios de pago y
// políticas son ESTIMADOS para la demo: confirmarlos con el negocio.
// ---------------------------------------------------------------------------

const inMotionHours: WeeklyHours = {
  ...closed,
  tue: [{ start: '10:00', end: '20:00' }],
  wed: [{ start: '10:00', end: '20:00' }],
  thu: [{ start: '10:00', end: '20:00' }],
  fri: [{ start: '10:00', end: '20:00' }],
  sat: [{ start: '09:00', end: '18:00' }],
}

const inMotion: TenantTemplate = {
  id: 'in-motion',
  label: 'In Motion · salón de color (datos de demo)',
  profile: {
    ...DEFAULT_PROFILE,
    name: 'In Motion',
    eyebrow: 'Color · Tratamientos · Styling',
    headline: 'Una experiencia pensada para tu cabello.',
    description: 'Diseño de color, cortes de caballero y tratamientos Wella Professionals en un espacio donde cada detalle importa.',
    logo: 'IM',
    location: 'San Isidro, Lima',
    address: '',
    phone: '+51 970 639 275',
    whatsapp: '51970639275',
    instagram: 'inmotionsalon.pe',
    email: '',
    accent: '#8a6a55',
    accentSoft: '#ede4da',
    surface: '#f1ebe3',
  },
  settings: { ...DEFAULT_SETTINGS, slotIntervalMinutes: 30, bookingWindowDays: 30, minNoticeMinutes: 180, weeklyHours: inMotionHours },
  assistant: {
    enabled: true,
    name: 'Asistente In Motion',
    tone: 'Cálido, cercano y profesional, como Adam (dueño y estilista). Si piden cortes de caballero, recomienda a Adam; si piden color, a Sheyla. Tutea, frases cortas, emojis suaves (🤍✨). Habla de "tu cabello" y de "la experiencia In Motion". Nunca promete precios finales sin diagnóstico; invita a reservar o a una asesoría.',
    greeting: '¡Hola! 🤍 Gracias por escribir a In Motion. ¿En qué te puedo ayudar hoy?',
    handoffMessage: 'Te paso con Adam o con alguien del equipo para darte una asesoría personalizada ✨',
  },
  services: [
    { name: 'Diagnóstico y asesoría de color', description: 'Evaluamos tu fibra capilar y diseñamos el plan ideal para ti', durationMinutes: 30, price: 50, active: true, order: 1 },
    { name: 'Diseño de color · Balayage / Morena iluminada', description: 'Luz, dimensión y movimiento a medida. Incluye matiz y styling', durationMinutes: 240, price: 480, active: true, order: 2 },
    { name: 'Color global', description: 'Color uniforme de raíz a puntas con fórmula personalizada', durationMinutes: 120, price: 250, active: true, order: 3 },
    { name: 'Retoque de raíz', description: 'Mantenimiento de color en crecimiento', durationMinutes: 90, price: 180, active: true, order: 4 },
    { name: 'Gloss / matiz', description: 'Brillo, neutraliza tonos y refresca el color', durationMinutes: 60, price: 150, active: true, order: 5 },
    { name: 'Ultimate Smooth by Wella', description: 'Hidratación profunda: de seco y rebelde a suave y manejable', durationMinutes: 90, price: 260, active: true, order: 6 },
    { name: 'Tratamiento Fusion · reconstrucción', description: 'Repara la fibra dañada por químicos o calor', durationMinutes: 75, price: 200, active: true, order: 7 },
    { name: 'Corte de caballero', description: 'Corte a tijera y máquina con lavado y acabado', durationMinutes: 45, price: 70, active: true, order: 8 },
    { name: 'Corte de caballero + barba', description: 'Corte, perfilado de barba y acabado', durationMinutes: 60, price: 95, active: true, order: 9 },
    { name: 'Corte & styling', description: 'Corte de dama personalizado con acabado', durationMinutes: 60, price: 120, active: true, order: 10 },
    { name: 'Brushing / ondas', description: 'Peinado con brillo y movimiento', durationMinutes: 45, price: 90, active: true, order: 11 },
  ],
  professionals: [
    {
      name: 'Adam García',
      role: 'Owner · Estilista',
      bio: 'Fundador de In Motion. Estilista especializado en cortes de caballero y styling.',
      instagram: 'adamgarcia.01',
      active: true,
      order: 1,
      serviceIndexes: [7, 8, 9, 10],
      weeklyHours: null,
    },
    {
      name: 'Sheyla',
      role: 'Colorista',
      bio: 'Especialista en color: balayage, morena iluminada, diseño de color y tratamientos.',
      instagram: 'sheyla_colorist',
      active: true,
      order: 2,
      serviceIndexes: [0, 1, 2, 3, 4, 5, 6],
      weeklyHours: {
        ...closed,
        wed: [{ start: '10:00', end: '19:00' }],
        thu: [{ start: '10:00', end: '19:00' }],
        fri: [{ start: '10:00', end: '19:00' }],
        sat: [{ start: '09:00', end: '18:00' }],
      },
    },
  ],
  products: [
    { name: 'Ultimate Repair Shampoo 250 ml', brand: 'Wella Professionals', category: 'Reparación', description: 'Limpieza suave que repara desde el primer lavado.', price: 129, stock: 10, active: true, order: 1 },
    { name: 'Ultimate Repair Conditioner 200 ml', brand: 'Wella Professionals', category: 'Reparación', description: 'Acondicionador reparador para cabello dañado.', price: 139, stock: 8, active: true, order: 2 },
    { name: 'Ultimate Repair Miracle Hair Rescue 95 ml', brand: 'Wella Professionals', category: 'Reparación', description: 'Tratamiento sin enjuague para reparar en segundos.', price: 159, stock: 6, active: true, order: 3 },
    { name: 'Ultimate Smooth Shampoo 250 ml', brand: 'Wella Professionals', category: 'Hidratación', description: 'Para cabello seco y con frizz; suavidad duradera.', price: 129, stock: 8, active: true, order: 4 },
    { name: 'Fusion Intense Repair Shampoo 250 ml', brand: 'Wella Professionals', category: 'Reparación', description: 'Reconstrucción intensa con aminoácidos de seda.', price: 99, stock: 10, active: true, order: 5 },
    { name: 'Color Motion+ Mask 150 ml', brand: 'Wella Professionals', category: 'Cuidado del color', description: 'Protege y prolonga la intensidad del color.', price: 119, stock: 7, active: true, order: 6 },
    { name: 'Oil Reflections Luminous Smoothening Oil 100 ml', brand: 'Wella Professionals', category: 'Brillo', description: 'Aceite ligero para brillo y suavidad.', price: 145, stock: 6, active: true, order: 7 },
    { name: 'EIMI Thermal Image 150 ml', brand: 'Wella Professionals', category: 'Styling', description: 'Protector térmico para plancha y secadora.', price: 89, stock: 9, active: true, order: 8 },
  ],
  faqs: [
    { question: '¿Cómo reservo una cita?', answer: 'Puedes reservar directamente en nuestra web eligiendo servicio, profesional y horario 🗓️. Tu cita queda pendiente y te confirmamos por WhatsApp. También puedes escribirnos al +51 970 639 275.', keywords: ['reservar', 'cita', 'agendar', 'turno'], active: true, order: 1 },
    { question: '¿Dónde están ubicados?', answer: 'Estamos en San Isidro, Lima 📍. Te enviamos la dirección exacta y referencias al confirmar tu cita.', keywords: ['dirección', 'ubicación', 'dónde', 'local'], active: true, order: 2 },
    { question: '¿Cuál es su horario de atención?', answer: 'Atendemos de martes a viernes de 10:00 a 20:00 y sábados de 9:00 a 18:00. Domingos y lunes descansamos 🤍', keywords: ['horario', 'hora', 'abren', 'atienden'], active: true, order: 3 },
    { question: '¿Cuánto cuesta un balayage o morena iluminada?', answer: 'El diseño de color parte desde S/ 480 e incluye matiz y styling ✨. El precio final depende del largo, la densidad y el historial de tu cabello, por eso siempre hacemos un diagnóstico antes de empezar.', keywords: ['precio', 'balayage', 'morena iluminada', 'mechas', 'cuánto'], active: true, order: 4 },
    { question: '¿Qué es el diagnóstico y asesoría?', answer: 'Es una evaluación de tu fibra capilar para diseñar el color o tratamiento ideal para ti. Cuidamos la salud de tu cabello antes que nada: cada decisión técnica deja huella en la fibra 🤍', keywords: ['diagnóstico', 'asesoría', 'evaluación'], active: true, order: 5 },
    { question: '¿Cómo me preparo para mi primera cita?', answer: 'Ven con el cabello seco y sin productos de peinado, trae fotos de referencia del look que te gusta y llega 10 minutos antes para conversar con calma. ¡Ponte cómoda y desconecta! ☕', keywords: ['primera vez', 'primera cita', 'preparar', 'recomendaciones'], active: true, order: 6 },
    { question: '¿Cuánto dura una sesión de color?', answer: 'Depende del servicio: un retoque de raíz toma alrededor de 1 h 30 min y un diseño de color completo entre 4 y 5 horas.', keywords: ['duración', 'cuánto demora', 'tiempo', 'horas'], active: true, order: 7 },
    { question: '¿Qué productos usan?', answer: 'Trabajamos con Wella Professionals ✨, por ejemplo el tratamiento Ultimate Smooth y la línea Ultimate Repair. También puedes llevarlos para tu cuidado en casa.', keywords: ['productos', 'marca', 'wella'], active: true, order: 8 },
    { question: '¿Hacen cortes de hombre?', answer: '¡Sí! Adam se especializa en cortes de caballero ✂️: corte desde S/ 70 y corte + barba desde S/ 95. Puedes reservar directo en la web eligiendo a Adam.', keywords: ['hombre', 'caballero', 'barba', 'corte de hombre', 'barbería'], active: true, order: 9 },
    { question: '¿Quién hace el color?', answer: 'Sheyla es nuestra colorista 🤍: balayage, morena iluminada, color global, retoques y tratamientos. Siempre empieza con un diagnóstico de tu cabello.', keywords: ['colorista', 'tinte', 'quién', 'sheyla'], active: true, order: 10 },
    { question: '¿Qué medios de pago aceptan?', answer: 'Aceptamos efectivo, Yape, Plin y tarjetas de débito y crédito.', keywords: ['pago', 'yape', 'plin', 'tarjeta', 'efectivo'], active: true, order: 11 },
    { question: '¿Puedo cancelar o reprogramar mi cita?', answer: 'Claro, solo avísanos con al menos 24 horas de anticipación por WhatsApp para liberar el espacio y reprogramarte 🤍', keywords: ['cancelar', 'reprogramar', 'cambiar cita', 'mover'], active: true, order: 12 },
  ],
}

export const TEMPLATES: TenantTemplate[] = [
  inMotion,
  {
    id: 'blank',
    label: 'En blanco',
    profile: DEFAULT_PROFILE,
    settings: DEFAULT_SETTINGS,
    assistant: DEFAULT_ASSISTANT,
    services: [],
    professionals: [],
    products: [],
    faqs: [],
  },
]
