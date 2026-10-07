import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { slotKeysFor } from '@/lib/domain/availability'
import { timeToMinutes } from '@/lib/domain/time'
import { normalizeAssistant, normalizeProfile, normalizeSettings, normalizeWeeklyHours } from '@/lib/domain/defaults'
import {
  BLOCKING_STATUSES,
  type Appointment,
  type AppointmentStatus,
  type Faq,
  type Product,
  type Professional,
  type Service,
  type SlotLock,
  type Tenant,
  type TimeBlock,
} from '@/lib/domain/types'
import { SlotTakenError, type AdminRepository, type BookingRepository, type ErrorListener } from '../repository'
import { getDb } from './client'

// Estructura en Firestore (ver firestore.rules):
//   tenants/{tenantId}                       perfil, configuración y adminUids
//   tenants/{tenantId}/services/{id}         catálogo (lectura pública)
//   tenants/{tenantId}/professionals/{id}    equipo (lectura pública)
//   tenants/{tenantId}/appointments/{id}     citas con datos personales (solo admins)
//   tenants/{tenantId}/slotLocks/{key}       bloques ocupados, sin datos personales (lectura pública)
//   tenants/{tenantId}/products/{id}         productos a la venta (lectura pública)
//   tenants/{tenantId}/timeBlocks/{id}       horarios bloqueados del equipo (solo admins)
//   tenants/{tenantId}/faqs/{id}             preguntas frecuentes / base del asistente (lectura pública)

const tenantRef = (tenantId: string) => doc(getDb(), 'tenants', tenantId)
const sub = (tenantId: string, name: 'services' | 'professionals' | 'appointments' | 'slotLocks' | 'products' | 'faqs' | 'timeBlocks') => collection(getDb(), 'tenants', tenantId, name)

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error))
}

function toTenant(snapshot: DocumentSnapshot<DocumentData>): Tenant | null {
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    id: snapshot.id,
    profile: normalizeProfile(data.profile),
    settings: normalizeSettings(data.settings),
    assistant: normalizeAssistant(data.assistant),
    adminUids: Array.isArray(data.adminUids) ? data.adminUids.map(String) : [],
    adminEmails: Array.isArray(data.adminEmails) ? data.adminEmails.map(String) : [],
  }
}

function toService(snapshot: QueryDocumentSnapshot<DocumentData>): Service {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    durationMinutes: Number(data.durationMinutes ?? 60),
    price: Number(data.price ?? 0),
    active: data.active !== false,
    order: Number(data.order ?? 0),
  }
}

function toProfessional(snapshot: QueryDocumentSnapshot<DocumentData>): Professional {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    role: String(data.role ?? ''),
    bio: String(data.bio ?? ''),
    instagram: String(data.instagram ?? ''),
    active: data.active !== false,
    order: Number(data.order ?? 0),
    serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds.map(String) : [],
    weeklyHours: normalizeWeeklyHours(data.weeklyHours),
  }
}

function toProduct(snapshot: QueryDocumentSnapshot<DocumentData>): Product {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    brand: String(data.brand ?? ''),
    category: String(data.category ?? ''),
    description: String(data.description ?? ''),
    price: Number(data.price ?? 0),
    stock: Number(data.stock ?? 0),
    active: data.active !== false,
    order: Number(data.order ?? 0),
  }
}

function toFaq(snapshot: QueryDocumentSnapshot<DocumentData>): Faq {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    question: String(data.question ?? ''),
    answer: String(data.answer ?? ''),
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
    active: data.active !== false,
    order: Number(data.order ?? 0),
  }
}

const STATUSES: AppointmentStatus[] = ['pending', 'approved', 'rejected', 'cancelled']

function toAppointment(snapshot: QueryDocumentSnapshot<DocumentData>): Appointment {
  const data = snapshot.data()
  const contact = (data.contact ?? {}) as Record<string, unknown>
  return {
    id: snapshot.id,
    serviceId: String(data.serviceId ?? ''),
    serviceName: String(data.serviceName ?? ''),
    durationMinutes: Number(data.durationMinutes ?? 0),
    price: Number(data.price ?? 0),
    professionalId: String(data.professionalId ?? ''),
    professionalName: String(data.professionalName ?? ''),
    date: String(data.date ?? ''),
    time: String(data.time ?? ''),
    contact: {
      name: String(contact.name ?? ''),
      email: String(contact.email ?? ''),
      phone: String(contact.phone ?? ''),
    },
    notes: String(data.notes ?? ''),
    status: STATUSES.includes(data.status) ? data.status : 'pending',
    source: data.source === 'admin' ? 'admin' : 'web',
    slotKeys: Array.isArray(data.slotKeys) ? data.slotKeys.map(String) : [],
    createdAt: typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate() : null,
  }
}

function toTimeBlock(snapshot: QueryDocumentSnapshot<DocumentData>): TimeBlock {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    professionalId: String(data.professionalId ?? ''),
    date: String(data.date ?? ''),
    start: String(data.start ?? ''),
    end: String(data.end ?? ''),
    reason: String(data.reason ?? ''),
    slotKeys: Array.isArray(data.slotKeys) ? data.slotKeys.map(String) : [],
  }
}

function lockData(key: string, appointmentId: string, professionalId: string, date: string) {
  const hhmm = key.slice(key.lastIndexOf('_') + 1)
  return { appointmentId, professionalId, date, time: `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`, createdAt: serverTimestamp() }
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

export const firebaseBookingRepository: BookingRepository = {
  async getTenant(tenantId) {
    return toTenant(await getDoc(tenantRef(tenantId)))
  },

  async listServices(tenantId, options) {
    const snapshot = await getDocs(sub(tenantId, 'services'))
    return snapshot.docs.map(toService).filter((item) => options?.includeInactive || item.active).sort(byOrder)
  },

  async listProfessionals(tenantId, options) {
    const snapshot = await getDocs(sub(tenantId, 'professionals'))
    return snapshot.docs.map(toProfessional).filter((item) => options?.includeInactive || item.active).sort(byOrder)
  },

  async listProducts(tenantId) {
    const snapshot = await getDocs(sub(tenantId, 'products'))
    return snapshot.docs.map(toProduct).filter((item) => item.active).sort(byOrder)
  },

  async listFaqs(tenantId) {
    const snapshot = await getDocs(sub(tenantId, 'faqs'))
    return snapshot.docs.map(toFaq).filter((item) => item.active).sort(byOrder)
  },

  subscribeToSlotLocks(tenantId, from, to, onData, onError) {
    try {
      const locksQuery = query(sub(tenantId, 'slotLocks'), where('date', '>=', from), where('date', '<=', to))
      return onSnapshot(
        locksQuery,
        (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, professionalId: String(item.data().professionalId), date: String(item.data().date), time: String(item.data().time) }) satisfies SlotLock)),
        (error) => onError?.(error),
      )
    } catch (error) {
      onError?.(toError(error))
      return () => undefined
    }
  },

  async createAppointment(tenantId, input) {
    const appointmentRef = doc(sub(tenantId, 'appointments'))
    const slotKeys = slotKeysFor(input.professional.id, input.date, input.time, input.service.durationMinutes, input.slotIntervalMinutes)

    await runTransaction(getDb(), async (transaction) => {
      const locks = await Promise.all(slotKeys.map((key) => transaction.get(doc(sub(tenantId, 'slotLocks'), key))))
      if (locks.some((lock) => lock.exists())) throw new SlotTakenError()

      transaction.set(appointmentRef, {
        serviceId: input.service.id,
        serviceName: input.service.name,
        durationMinutes: input.service.durationMinutes,
        price: input.service.price,
        professionalId: input.professional.id,
        professionalName: input.professional.name,
        date: input.date,
        time: input.time,
        contact: {
          name: input.contact.name.trim(),
          email: input.contact.email.trim().toLowerCase(),
          phone: input.contact.phone.trim(),
        },
        notes: (input.notes ?? '').trim(),
        status: input.status ?? ('pending' satisfies AppointmentStatus),
        source: input.source,
        slotKeys,
        createdAt: serverTimestamp(),
      })

      slotKeys.forEach((key) => {
        transaction.set(doc(sub(tenantId, 'slotLocks'), key), lockData(key, appointmentRef.id, input.professional.id, input.date))
      })
    })

    return appointmentRef.id
  },
}

function subscribeCollection<T>(
  source: Query<DocumentData>,
  map: (snapshot: QueryDocumentSnapshot<DocumentData>) => T,
  onData: (items: T[]) => void,
  onError?: ErrorListener,
) {
  try {
    return onSnapshot(
      source,
      (snapshot) => onData(snapshot.docs.map(map)),
      (error) => onError?.(error),
    )
  } catch (error) {
    onError?.(toError(error))
    return () => undefined
  }
}

type CatalogCollection = 'services' | 'professionals' | 'products' | 'faqs'

async function saveIn(tenantId: string, name: CatalogCollection, input: object, id?: string) {
  const ref = id ? doc(sub(tenantId, name), id) : doc(sub(tenantId, name))
  await setDoc(ref, { ...input, updatedAt: serverTimestamp() }, { merge: true })
  return ref.id
}

async function deleteIn(tenantId: string, name: CatalogCollection, id: string) {
  await deleteDoc(doc(sub(tenantId, name), id))
}

export const firebaseAdminRepository: AdminRepository = {
  async createTenant(tenantId, input) {
    await setDoc(tenantRef(tenantId), { ...input, createdAt: serverTimestamp() })
  },

  async updateTenant(tenantId, input) {
    await updateDoc(tenantRef(tenantId), { ...input, updatedAt: serverTimestamp() })
  },

  subscribeToTenant(tenantId, onData, onError) {
    try {
      return onSnapshot(tenantRef(tenantId), (snapshot) => onData(toTenant(snapshot)), (error) => onError?.(error))
    } catch (error) {
      onError?.(toError(error))
      return () => undefined
    }
  },

  subscribeToAppointments(tenantId, onData, onError) {
    return subscribeCollection(
      query(sub(tenantId, 'appointments'), orderBy('date', 'desc')),
      toAppointment,
      (items) => onData(items.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))),
      onError,
    )
  },

  async updateAppointmentStatus(tenantId, appointment, status) {
    const appointmentRef = doc(sub(tenantId, 'appointments'), appointment.id)
    const wasBlocking = BLOCKING_STATUSES.includes(appointment.status)
    const willBlock = BLOCKING_STATUSES.includes(status)

    if (wasBlocking === willBlock) {
      await updateDoc(appointmentRef, { status, updatedAt: serverTimestamp() })
      return
    }

    if (!willBlock) {
      // Liberar la agenda al rechazar o cancelar.
      const batch = writeBatch(getDb())
      batch.update(appointmentRef, { status, updatedAt: serverTimestamp() })
      appointment.slotKeys.forEach((key) => batch.delete(doc(sub(tenantId, 'slotLocks'), key)))
      await batch.commit()
      return
    }

    // Reactivar una cita: volver a ocupar su horario solo si sigue libre.
    await runTransaction(getDb(), async (transaction) => {
      const locks = await Promise.all(appointment.slotKeys.map((key) => transaction.get(doc(sub(tenantId, 'slotLocks'), key))))
      if (locks.some((lock) => lock.exists() && lock.data().appointmentId !== appointment.id)) throw new SlotTakenError()
      transaction.update(appointmentRef, { status, updatedAt: serverTimestamp() })
      appointment.slotKeys.forEach((key) => {
        transaction.set(doc(sub(tenantId, 'slotLocks'), key), lockData(key, appointment.id, appointment.professionalId, appointment.date))
      })
    })
  },

  subscribeToServices(tenantId, onData, onError) {
    return subscribeCollection(sub(tenantId, 'services'), toService, (items) => onData(items.sort(byOrder)), onError)
  },

  saveService: (tenantId, input, id) => saveIn(tenantId, 'services', input, id),
  deleteService: (tenantId, id) => deleteIn(tenantId, 'services', id),

  subscribeToProfessionals(tenantId, onData, onError) {
    return subscribeCollection(sub(tenantId, 'professionals'), toProfessional, (items) => onData(items.sort(byOrder)), onError)
  },

  saveProfessional: (tenantId, input, id) => saveIn(tenantId, 'professionals', input, id),
  deleteProfessional: (tenantId, id) => deleteIn(tenantId, 'professionals', id),

  subscribeToProducts(tenantId, onData, onError) {
    return subscribeCollection(sub(tenantId, 'products'), toProduct, (items) => onData(items.sort(byOrder)), onError)
  },
  saveProduct: (tenantId, input, id) => saveIn(tenantId, 'products', input, id),
  deleteProduct: (tenantId, id) => deleteIn(tenantId, 'products', id),

  subscribeToFaqs(tenantId, onData, onError) {
    return subscribeCollection(sub(tenantId, 'faqs'), toFaq, (items) => onData(items.sort(byOrder)), onError)
  },
  saveFaq: (tenantId, input, id) => saveIn(tenantId, 'faqs', input, id),
  deleteFaq: (tenantId, id) => deleteIn(tenantId, 'faqs', id),

  subscribeToTimeBlocks(tenantId, onData, onError) {
    return subscribeCollection(sub(tenantId, 'timeBlocks'), toTimeBlock, onData, onError)
  },

  async createTimeBlock(tenantId, input) {
    const blockRef = doc(sub(tenantId, 'timeBlocks'))
    const duration = timeToMinutes(input.end) - timeToMinutes(input.start)
    if (duration <= 0) throw new Error('El fin del bloqueo debe ser posterior al inicio.')
    const slotKeys = slotKeysFor(input.professionalId, input.date, input.start, duration, input.slotIntervalMinutes)

    await runTransaction(getDb(), async (transaction) => {
      const locks = await Promise.all(slotKeys.map((key) => transaction.get(doc(sub(tenantId, 'slotLocks'), key))))
      if (locks.some((lock) => lock.exists())) throw new SlotTakenError()
      transaction.set(blockRef, {
        professionalId: input.professionalId,
        date: input.date,
        start: input.start,
        end: input.end,
        reason: input.reason.trim(),
        slotKeys,
        createdAt: serverTimestamp(),
      })
      slotKeys.forEach((key) => transaction.set(doc(sub(tenantId, 'slotLocks'), key), lockData(key, `block:${blockRef.id}`, input.professionalId, input.date)))
    })
    return blockRef.id
  },

  async deleteTimeBlock(tenantId, block) {
    const batch = writeBatch(getDb())
    batch.delete(doc(sub(tenantId, 'timeBlocks'), block.id))
    block.slotKeys.forEach((key) => batch.delete(doc(sub(tenantId, 'slotLocks'), key)))
    await batch.commit()
  },
}
