// Pruebas de firestore.rules contra el emulador.
// Ejecutar con: npm run test:rules  (requiere Java para el emulador de Firestore)
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestContext, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, collection, runTransaction, serverTimestamp, setDoc, updateDoc, type Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const T = 'tenant-test'
let env: RulesTestEnvironment

const service = { name: 'Corte', description: '', durationMinutes: 60, price: 100, active: true, order: 1 }
const professional = { name: 'Ana', role: 'Stylist', active: true, order: 1, serviceIds: [] }

function appointment(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: 's1', serviceName: 'Corte', durationMinutes: 60, price: 100,
    professionalId: 'p1', professionalName: 'Ana', date: '2030-01-10', time: '10:00',
    contact: { name: 'Cliente', email: 'c@example.com', phone: '999' }, notes: '',
    status: 'pending', source: 'web', slotKeys: ['p1_2030-01-10_1000', 'p1_2030-01-10_1030'],
    createdAt: serverTimestamp(), ...overrides,
  }
}

async function book(ctxDb: ReturnType<RulesTestContext['firestore']>, id: string, data = appointment()) {
  const db = ctxDb as unknown as Firestore
  return runTransaction(db, async (tx) => {
    tx.set(doc(db, `tenants/${T}/appointments/${id}`), data)
    for (const key of data.slotKeys as string[]) {
      tx.set(doc(db, `tenants/${T}/slotLocks/${key}`), { appointmentId: id, professionalId: 'p1', date: data.date, time: '10:00', createdAt: serverTimestamp() })
    }
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-inmotion', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})

afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, `tenants/${T}`), { profile: { name: 'Test' }, settings: {}, adminUids: ['admin'], adminEmails: ['dueno@example.com'] })
    await setDoc(doc(db, `tenants/${T}/services/s1`), service)
    await setDoc(doc(db, `tenants/${T}/professionals/p1`), professional)
  })
})

describe('público', () => {
  it('lee negocio, catálogo y bloqueos', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, `tenants/${T}`)))
    await assertSucceeds(getDocs(collection(db, `tenants/${T}/services`)))
    await assertSucceeds(getDocs(collection(db, `tenants/${T}/slotLocks`)))
  })

  it('no lee citas ni escribe catálogo', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDocs(collection(db, `tenants/${T}/appointments`)))
    await assertFails(setDoc(doc(db, `tenants/${T}/services/x`), service))
  })

  it('reserva con bloqueo atómico', async () => {
    await assertSucceeds(book(env.unauthenticatedContext().firestore(), 'a1'))
  })

  it('no puede reservar un horario ocupado', async () => {
    await book(env.unauthenticatedContext().firestore(), 'a1')
    await assertFails(book(env.unauthenticatedContext().firestore(), 'a2'))
  })

  it('no puede crear citas aprobadas ni con precio alterado', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(book(db, 'a1', appointment({ status: 'approved' })))
    await assertFails(book(db, 'a2', appointment({ price: 1 })))
  })

  it('no puede crear bloqueos sin cita', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, `tenants/${T}/slotLocks/p1_2030-01-10_1000`), { appointmentId: 'nada', professionalId: 'p1', date: '2030-01-10', time: '10:00', createdAt: serverTimestamp() }))
  })
})

describe('administración', () => {
  it('el admin lee y actualiza citas', async () => {
    await book(env.unauthenticatedContext().firestore(), 'a1')
    const db = env.authenticatedContext('admin').firestore()
    await assertSucceeds(getDocs(collection(db, `tenants/${T}/appointments`)))
    await assertSucceeds(updateDoc(doc(db, `tenants/${T}/appointments/a1`), { status: 'approved' }))
  })

  it('un admin por correo gestiona productos y FAQs', async () => {
    const db = env.authenticatedContext('uid-dueno', { email: 'Dueno@Example.com' }).firestore()
    await assertSucceeds(setDoc(doc(db, `tenants/${T}/products/x`), { name: 'Shampoo', price: 100, stock: 3 }))
    await assertSucceeds(setDoc(doc(db, `tenants/${T}/faqs/x`), { question: '¿?', answer: 'ok' }))
    await assertSucceeds(updateDoc(doc(db, `tenants/${T}`), { 'profile.name': 'Nuevo' }))
  })

  it('el público lee productos y FAQs pero no los escribe', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertSucceeds(getDocs(collection(db, `tenants/${T}/products`)))
    await assertSucceeds(getDocs(collection(db, `tenants/${T}/faqs`)))
    await assertFails(setDoc(doc(db, `tenants/${T}/products/x`), { name: 'hack' }))
  })

  it('solo el admin ve y crea bloqueos de horario', async () => {
    const admin = env.authenticatedContext('admin').firestore()
    await assertSucceeds(setDoc(doc(admin, `tenants/${T}/timeBlocks/b1`), { professionalId: 'p1', date: '2030-01-10', start: '13:00', end: '14:00', reason: 'Almuerzo' }))
    await assertSucceeds(setDoc(doc(admin, `tenants/${T}/slotLocks/p1_2030-01-10_1300`), { appointmentId: 'block:b1', professionalId: 'p1', date: '2030-01-10', time: '13:00', createdAt: serverTimestamp() }))
    const anon = env.unauthenticatedContext().firestore()
    await assertFails(getDocs(collection(anon, `tenants/${T}/timeBlocks`)))
  })

  it('otro usuario autenticado no accede', async () => {
    const db = env.authenticatedContext('intruso').firestore()
    await assertFails(getDocs(collection(db, `tenants/${T}/appointments`)))
    await assertFails(updateDoc(doc(db, `tenants/${T}`), { 'profile.name': 'Hack' }))
  })

  it('el admin no puede cambiar adminUids desde la app', async () => {
    const db = env.authenticatedContext('admin').firestore()
    await assertFails(updateDoc(doc(db, `tenants/${T}`), { adminUids: ['admin', 'otro'] }))
    await assertFails(updateDoc(doc(db, `tenants/${T}`), { adminEmails: ['dueno@example.com', 'otro@example.com'] }))
  })

  it('solo se crea un negocio nuevo con uno mismo como admin', async () => {
    const db = env.authenticatedContext('nuevo', { email: 'nuevo@example.com' }).firestore()
    await assertSucceeds(setDoc(doc(db, 'tenants/otro'), { profile: {}, settings: {}, adminUids: ['nuevo'], adminEmails: ['nuevo@example.com'] }))
    await assertFails(setDoc(doc(db, 'tenants/otro3'), { profile: {}, settings: {}, adminUids: ['nuevo'], adminEmails: ['victima@example.com'] }))
    await assertFails(setDoc(doc(db, 'tenants/otro2'), { profile: {}, settings: {}, adminUids: ['alguien'] }))
    await assertFails(setDoc(doc(db, `tenants/${T}`), { profile: {}, settings: {}, adminUids: ['nuevo'] }))
  })
})
