// Carga inicial de un negocio a partir de una plantilla (config/templates.ts).
//
//   npm run seed -- --admin-email dueno@correo.com [--template in-motion] [--tenant in-motion-san-isidro] [--demo]
//
// --demo agrega citas y bloqueos de ejemplo en los próximos días para mostrar la agenda.
//
// Con las reglas publicadas, las escrituras requieren un admin: define
// SEED_EMAIL y SEED_PASSWORD (usuario de Firebase Auth) para iniciar sesión.
// Para usar los emuladores locales: NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true.
import { parseArgs } from 'node:util'
import { appConfig } from '@/config/app'
import { TEMPLATES } from '@/config/templates'
import { getDataProvider } from '@/lib/data'
import { computeAvailability, professionalCanDo, slotKeysFor } from '@/lib/domain/availability'
import { addDays, nowInTimezone } from '@/lib/domain/time'
import { applyTemplate } from '@/lib/seed'

const { values } = parseArgs({
  options: {
    tenant: { type: 'string', default: appConfig.tenantId },
    template: { type: 'string', default: TEMPLATES[0].id },
    'admin-email': { type: 'string', multiple: true, default: [] },
    'include-profile': { type: 'boolean', default: false },
    demo: { type: 'boolean', default: false },
  },
})

async function main() {
  const template = TEMPLATES.find((item) => item.id === values.template)
  if (!template) throw new Error(`Plantilla desconocida: ${values.template}. Opciones: ${TEMPLATES.map((item) => item.id).join(', ')}`)
  const tenantId = values.tenant!
  const { auth, admin, booking } = getDataProvider()

  let adminUids: string[] = []
  let adminEmails = (values['admin-email'] ?? []).map((email) => email.toLowerCase())
  if (process.env.SEED_EMAIL && process.env.SEED_PASSWORD) {
    const user = await auth.signIn(process.env.SEED_EMAIL, process.env.SEED_PASSWORD)
    console.log(`Sesión iniciada como ${user.email}`)
    // Las reglas solo permiten crear un negocio con uno mismo como admin.
    adminUids = [user.uid]
    adminEmails = user.email ? [user.email.toLowerCase()] : []
  }

  const exists = Boolean(await booking.getTenant(tenantId))
  const result = await applyTemplate(admin, booking, tenantId, template, {
    createTenant: exists ? undefined : { adminUids, adminEmails },
    includeProfile: values['include-profile'],
  })

  console.log(`${exists ? 'Actualizado' : 'Creado'} tenants/${tenantId} con la plantilla "${template.id}":`, result)
  if (!exists && adminEmails.length) console.log(`Administradores: ${adminEmails.join(', ')}`)
  if (values.demo) await createDemoBookings(tenantId)
}

const DEMO_CLIENTS = ['Lucía Ramírez', 'Valeria Torres', 'Camila Fernández', 'Diego Salazar', 'Andrea Paredes', 'Martín Quispe', 'Sofía Mendoza', 'Renato Castillo', 'Daniela Rojas', 'Gabriel Vega']

/** Citas y un almuerzo bloqueado en los próximos días, en horarios realmente libres. */
async function createDemoBookings(tenantId: string) {
  const { booking, admin } = getDataProvider()
  const tenant = await booking.getTenant(tenantId)
  if (!tenant) throw new Error('El negocio no existe')
  const [services, professionals] = await Promise.all([booking.listServices(tenantId), booking.listProfessionals(tenantId)])
  const today = nowInTimezone(tenant.settings.timezone).date
  const taken = new Set<string>()
  const unsubscribe = booking.subscribeToSlotLocks(tenantId, today, addDays(today, 14), (locks) => locks.forEach((lock) => taken.add(lock.id)))
  await new Promise((resolve) => setTimeout(resolve, 1500))
  unsubscribe()

  let created = 0
  for (const [index, name] of DEMO_CLIENTS.entries()) {
    const professional = professionals[index % professionals.length]
    const options = services.filter((service) => professionalCanDo(professional, service.id))
    const service = options[index % options.length]
    if (!service) continue
    const days = computeAvailability({ settings: { ...tenant.settings, minNoticeMinutes: 0 }, service, professionalId: professional.id, professionalHours: professional.weeklyHours, takenKeys: taken })
    const day = days[Math.floor(index / professionals.length) % Math.max(1, Math.min(days.length, 4))]
    const time = day?.slots[(index * 3) % day.slots.length]
    if (!day || !time) continue
    try {
      await booking.createAppointment(tenantId, {
        service, professional, date: day.date, time, notes: 'Cita de demostración', source: 'admin',
        status: index % 3 === 0 ? 'pending' : 'approved',
        contact: { name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: `9${String(10000000 + index * 7654321).slice(0, 8)}` },
        slotIntervalMinutes: tenant.settings.slotIntervalMinutes,
      })
      created++
      // Marca como ocupados los bloques recién usados para no chocar en la siguiente vuelta.
      slotKeysFor(professional.id, day.date, time, service.durationMinutes, tenant.settings.slotIntervalMinutes).forEach((key) => taken.add(key))
    } catch (error) {
      console.warn(`No se pudo crear la cita de ${name}:`, (error as Error).message)
    }
  }

  const colorist = professionals.find((item) => /color/i.test(item.role)) ?? professionals[0]
  try {
    await admin.createTimeBlock(tenantId, { professionalId: colorist.id, date: addDays(today, 1), start: '13:00', end: '14:00', reason: 'Almuerzo', slotIntervalMinutes: tenant.settings.slotIntervalMinutes })
  } catch {
    // El almuerzo de demo es opcional: si el horario ya está ocupado, se omite.
  }
  console.log(`Demo: ${created} citas de ejemplo creadas.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
