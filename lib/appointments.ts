import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'

export const APPOINTMENTS_COLLECTION = 'appointments'

export type AppointmentStatus = 'pending' | 'approved' | 'rejected'

export type AppointmentContact = {
  name: string
  email: string
  phone: string
}

export type Appointment = {
  id: string
  salon_id: string
  service: string
  professional: string
  date: string
  time: string
  contact: AppointmentContact
  status: AppointmentStatus
}

export type CreateAppointmentInput = {
  salon_id: string
  service: string
  professional: string
  date: string
  time: string
  contact: AppointmentContact
}

export function subscribeToAppointments(
  salonId: string,
  onData: (appointments: Appointment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      collection(getDb(), APPOINTMENTS_COLLECTION),
      (snapshot) => {
        const appointments = snapshot.docs
          .map((snapshotDoc) => {
            const data = snapshotDoc.data()
            const contact = (data.contact ?? {}) as Partial<AppointmentContact>
            const status = data.status as AppointmentStatus | undefined

            return {
              id: snapshotDoc.id,
              salon_id: String(data.salon_id ?? ''),
              service: String(data.service ?? ''),
              professional: String(data.professional ?? ''),
              date: String(data.date ?? ''),
              time: String(data.time ?? ''),
              contact: {
                name: String(contact.name ?? data.client_name ?? ''),
                email: String(contact.email ?? ''),
                phone: String(contact.phone ?? ''),
              },
              status: status === 'approved' || status === 'rejected' ? status : 'pending',
            } satisfies Appointment
          })
          .filter((appointment) => appointment.salon_id === salonId)
          .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))

        onData(appointments)
      },
      (error) => {
        onError?.(error)
      },
    )
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error('No se pudo conectar a Firestore'))
    return () => undefined
  }
}

export async function createAppointment(input: CreateAppointmentInput) {
  await addDoc(collection(getDb(), APPOINTMENTS_COLLECTION), {
    ...input,
    status: 'pending' satisfies AppointmentStatus,
    createdAt: serverTimestamp(),
  })
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  await updateDoc(doc(getDb(), APPOINTMENTS_COLLECTION, id), { status })
}
