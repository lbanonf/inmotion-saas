import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '@/config/templates'
import { buildAssistantPrompt, matchFaq } from './assistant'
import type { Faq, Tenant } from './types'

const template = TEMPLATES[0]
const faqs: Faq[] = template.faqs.map((faq, index) => ({ ...faq, id: `f${index}` }))

describe('matchFaq', () => {
  it('encuentra la respuesta por palabras clave sin importar tildes', () => {
    expect(matchFaq('Hola! cuanto cuesta un balayage?', faqs)?.faq.question).toMatch(/balayage/)
    expect(matchFaq('aceptan yape?', faqs)?.faq.question).toMatch(/pago/)
    expect(matchFaq('Dónde queda el local', faqs)?.faq.question).toMatch(/ubicados/)
  })

  it('no responde cuando no hay coincidencia clara', () => {
    expect(matchFaq('jajaja ok', faqs)).toBeNull()
  })
})

describe('buildAssistantPrompt', () => {
  it('incluye servicios, horarios y FAQs del negocio', () => {
    const tenant: Tenant = { id: 't', profile: template.profile, settings: template.settings, assistant: template.assistant, adminUids: [], adminEmails: [] }
    const prompt = buildAssistantPrompt({
      tenant,
      services: template.services.map((service, index) => ({ ...service, id: `s${index}` })),
      professionals: [],
      products: [],
      faqs,
      bookingUrl: 'https://example.com',
    })
    expect(prompt).toContain('Asistente In Motion')
    expect(prompt).toContain('Lunes: cerrado')
    expect(prompt).toContain('Ultimate Smooth by Wella')
    expect(prompt).toContain('P: ¿Cómo reservo una cita?')
  })
})
