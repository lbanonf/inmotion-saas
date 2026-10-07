// Carga inicial de un negocio a partir de una plantilla (config/templates.ts).
//
//   npm run seed -- --admin-email dueno@correo.com [--template in-motion] [--tenant in-motion-san-isidro]
//
// Con las reglas publicadas, las escrituras requieren un admin: define
// SEED_EMAIL y SEED_PASSWORD (usuario de Firebase Auth) para iniciar sesión.
// Para usar los emuladores locales: NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true.
import { parseArgs } from 'node:util'
import { appConfig } from '@/config/app'
import { TEMPLATES } from '@/config/templates'
import { getDataProvider } from '@/lib/data'
import { applyTemplate } from '@/lib/seed'

const { values } = parseArgs({
  options: {
    tenant: { type: 'string', default: appConfig.tenantId },
    template: { type: 'string', default: TEMPLATES[0].id },
    'admin-email': { type: 'string', multiple: true, default: [] },
    'include-profile': { type: 'boolean', default: false },
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
  const result = await applyTemplate(admin, tenantId, template, {
    createTenant: exists ? undefined : { adminUids, adminEmails },
    includeProfile: values['include-profile'],
  })

  console.log(`${exists ? 'Actualizado' : 'Creado'} tenants/${tenantId} con la plantilla "${template.id}":`, result)
  if (!exists && adminEmails.length) console.log(`Administradores: ${adminEmails.join(', ')}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
