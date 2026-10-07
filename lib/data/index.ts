import { appConfig } from '@/config/app'
import { firebaseAuthProvider } from './firebase/auth'
import { firebaseAdminRepository, firebaseBookingRepository } from './firebase/repository'
import type { DataProvider } from './repository'

export * from './repository'

// Registro de proveedores de datos. Para añadir otro backend, implementa
// DataProvider (ver lib/data/repository.ts), agrégalo aquí y selecciónalo con
// NEXT_PUBLIC_DATA_PROVIDER.
const providers: Record<string, () => DataProvider> = {
  firebase: () => ({ booking: firebaseBookingRepository, admin: firebaseAdminRepository, auth: firebaseAuthProvider }),
}

let current: DataProvider | undefined

export function getDataProvider(): DataProvider {
  if (current) return current
  const factory = providers[appConfig.dataProvider]
  if (!factory) throw new Error(`Proveedor de datos desconocido: "${appConfig.dataProvider}"`)
  current = factory()
  return current
}
