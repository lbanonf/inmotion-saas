import type { TenantTemplate } from '@/config/templates'
import type { AdminRepository } from '@/lib/data/repository'

type ApplyOptions = {
  /** Crea el documento del negocio. Si es false, solo actualiza perfil/config cuando includeProfile es true. */
  createTenant?: { adminUids: string[]; adminEmails: string[] }
  /** Sobrescribe marca, horarios y asistente con los de la plantilla. */
  includeProfile?: boolean
}

/**
 * Carga una plantilla (servicios, equipo, productos y preguntas frecuentes) en un negocio.
 * Agrega registros nuevos; no borra los existentes.
 */
export async function applyTemplate(admin: AdminRepository, tenantId: string, template: TenantTemplate, options: ApplyOptions = {}) {
  if (options.createTenant) {
    await admin.createTenant(tenantId, { profile: template.profile, settings: template.settings, assistant: template.assistant, ...options.createTenant })
  } else if (options.includeProfile) {
    await admin.updateTenant(tenantId, { profile: template.profile, settings: template.settings, assistant: template.assistant })
  }

  const serviceIds = await Promise.all(template.services.map((service) => admin.saveService(tenantId, service)))
  await Promise.all([
    ...template.professionals.map(({ serviceIndexes, ...professional }) =>
      admin.saveProfessional(tenantId, { ...professional, serviceIds: serviceIndexes.map((index) => serviceIds[index]).filter(Boolean) }),
    ),
    ...template.products.map((product) => admin.saveProduct(tenantId, product)),
    ...template.faqs.map((faq) => admin.saveFaq(tenantId, faq)),
  ])

  return {
    services: template.services.length,
    professionals: template.professionals.length,
    products: template.products.length,
    faqs: template.faqs.length,
  }
}
