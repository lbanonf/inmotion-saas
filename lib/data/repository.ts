// Contratos de acceso a datos. La UI solo depende de estas interfaces;
// para migrar a otro backend (Supabase, API REST propia, etc.) basta con
// implementar `DataProvider` y registrarlo en lib/data/index.ts.

import type {
  AdminUser,
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  Faq,
  FaqInput,
  Product,
  ProductInput,
  Professional,
  ProfessionalInput,
  Service,
  ServiceInput,
  SlotLock,
  Tenant,
  TenantInput,
} from '@/lib/domain/types'

export type Unsubscribe = () => void

export type Listener<T> = (value: T) => void

export type ErrorListener = (error: Error) => void

/** Operaciones públicas que usa la landing de reservas. */
export interface BookingRepository {
  getTenant(tenantId: string): Promise<Tenant | null>
  listServices(tenantId: string, options?: { includeInactive?: boolean }): Promise<Service[]>
  listProfessionals(tenantId: string, options?: { includeInactive?: boolean }): Promise<Professional[]>
  listProducts(tenantId: string): Promise<Product[]>
  listFaqs(tenantId: string): Promise<Faq[]>
  /** Bloqueos de agenda entre dos fechas (YYYY-MM-DD, inclusive). */
  subscribeToSlotLocks(tenantId: string, from: string, to: string, onData: Listener<SlotLock[]>, onError?: ErrorListener): Unsubscribe
  /** Crea la cita y bloquea su horario de forma atómica. Lanza SlotTakenError si el horario ya no está libre. */
  createAppointment(tenantId: string, input: CreateAppointmentInput): Promise<string>
}

/** Operaciones del panel de administración (requieren sesión). */
export interface AdminRepository {
  createTenant(tenantId: string, input: TenantInput): Promise<void>
  updateTenant(tenantId: string, input: Partial<Pick<Tenant, 'profile' | 'settings' | 'assistant'>>): Promise<void>
  subscribeToTenant(tenantId: string, onData: Listener<Tenant | null>, onError?: ErrorListener): Unsubscribe

  subscribeToAppointments(tenantId: string, onData: Listener<Appointment[]>, onError?: ErrorListener): Unsubscribe
  updateAppointmentStatus(tenantId: string, appointment: Appointment, status: AppointmentStatus): Promise<void>

  subscribeToServices(tenantId: string, onData: Listener<Service[]>, onError?: ErrorListener): Unsubscribe
  saveService(tenantId: string, input: ServiceInput, id?: string): Promise<string>
  deleteService(tenantId: string, id: string): Promise<void>

  subscribeToProfessionals(tenantId: string, onData: Listener<Professional[]>, onError?: ErrorListener): Unsubscribe
  saveProfessional(tenantId: string, input: ProfessionalInput, id?: string): Promise<string>
  deleteProfessional(tenantId: string, id: string): Promise<void>

  subscribeToProducts(tenantId: string, onData: Listener<Product[]>, onError?: ErrorListener): Unsubscribe
  saveProduct(tenantId: string, input: ProductInput, id?: string): Promise<string>
  deleteProduct(tenantId: string, id: string): Promise<void>

  subscribeToFaqs(tenantId: string, onData: Listener<Faq[]>, onError?: ErrorListener): Unsubscribe
  saveFaq(tenantId: string, input: FaqInput, id?: string): Promise<string>
  deleteFaq(tenantId: string, id: string): Promise<void>
}

export interface AuthProvider {
  onAuthChange(listener: Listener<AdminUser | null>): Unsubscribe
  signIn(email: string, password: string): Promise<AdminUser>
  sendPasswordReset(email: string): Promise<void>
  signOut(): Promise<void>
}

export type DataProvider = {
  booking: BookingRepository
  admin: AdminRepository
  auth: AuthProvider
}

export class SlotTakenError extends Error {
  constructor() {
    super('El horario seleccionado ya no está disponible.')
    this.name = 'SlotTakenError'
  }
}
