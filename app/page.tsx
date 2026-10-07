import { BookingLanding } from '@/components/booking-landing'
import { appConfig } from '@/config/app'

// El contenido del negocio (servicios, equipo, horarios, marca) se lee de la
// base de datos y se administra desde /admin. Para otra marca basta con cambiar
// NEXT_PUBLIC_TENANT_ID.
export default function Page() {
  return <BookingLanding tenantId={appConfig.tenantId} />
}
