import type { TenantTemplate } from '@/config/templates'
import type { AdminRepository, BookingRepository } from '@/lib/data/repository'
import { normalizeText } from '@/lib/domain/assistant'

type ApplyOptions = {
  /** Crea el documento del negocio. Si es false, solo actualiza perfil/config cuando includeProfile es true. */
  createTenant?: { adminUids: string[]; adminEmails: string[] }
  /** Sobrescribe marca, horarios y asistente con los de la plantilla. */
  includeProfile?: boolean
}

const keyOf = (text: string) => normalizeText(text)

/**
 * Carga una plantilla (servicios, equipo, productos y preguntas frecuentes) en un negocio.
 * Es idempotente: si ya existe un registro con el mismo nombre (o pregunta) lo actualiza;
 * si no, lo crea. Nunca borra registros.
 */
export async function applyTemplate(admin: AdminRepository, booking: BookingRepository, tenantId: string, template: TenantTemplate, options: ApplyOptions = {}) {
  if (options.createTenant) {
    await admin.createTenant(tenantId, { profile: template.profile, settings: template.settings, assistant: template.assistant, ...options.createTenant })
  } else if (options.includeProfile) {
    await admin.updateTenant(tenantId, { profile: template.profile, settings: template.settings, assistant: template.assistant })
  }

  const [services, professionals, products, faqs] = options.createTenant
    ? [[], [], [], []]
    : await Promise.all([
        booking.listServices(tenantId, { includeInactive: true }),
        booking.listProfessionals(tenantId, { includeInactive: true }),
        booking.listProducts(tenantId),
        booking.listFaqs(tenantId),
      ])
  const idBy = <T extends { id: string }>(items: T[], label: (item: T) => string) => new Map(items.map((item) => [keyOf(label(item)), item.id]))
  const serviceIdByName = idBy(services, (item) => item.name)
  const professionalIdByName = idBy(professionals, (item) => item.name)
  const productIdByName = idBy(products, (item) => item.name)
  const faqIdByQuestion = idBy(faqs, (item) => item.question)

  const serviceIds = await Promise.all(template.services.map((service) => admin.saveService(tenantId, service, serviceIdByName.get(keyOf(service.name)))))
  await Promise.all([
    ...template.professionals.map(({ serviceIndexes, ...professional }) =>
      admin.saveProfessional(tenantId, { ...professional, serviceIds: serviceIndexes.map((index) => serviceIds[index]).filter(Boolean) }, professionalIdByName.get(keyOf(professional.name))),
    ),
    ...template.products.map((product) => admin.saveProduct(tenantId, product, productIdByName.get(keyOf(product.name)))),
    ...template.faqs.map((faq) => admin.saveFaq(tenantId, faq, faqIdByQuestion.get(keyOf(faq.question)))),
  ])

  return {
    services: template.services.length,
    professionals: template.professionals.length,
    products: template.products.length,
    faqs: template.faqs.length,
  }
}
