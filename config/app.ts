// Configuración de despliegue. Cada instancia (marca/negocio) solo cambia
// variables de entorno; el contenido del negocio vive en la base de datos y
// se edita desde /admin.

export const appConfig = {
  /** Identificador del negocio (documento tenants/{tenantId}). */
  tenantId: process.env.NEXT_PUBLIC_TENANT_ID || 'in-motion-san-isidro',
  /** Backend de datos registrado en lib/data/index.ts. */
  dataProvider: process.env.NEXT_PUBLIC_DATA_PROVIDER || 'firebase',
  /** Nombre usado en metadatos y como respaldo mientras carga el negocio. */
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'In Motion',
  appDescription: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Reserva tu cita online.',
}
