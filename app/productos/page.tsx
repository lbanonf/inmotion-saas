import type { Metadata } from 'next'
import { ProductCatalog } from '@/components/product-catalog'
import { appConfig } from '@/config/app'

export const metadata: Metadata = {
  title: `Productos · ${appConfig.appName}`,
}

export default function Page() {
  return <ProductCatalog tenantId={appConfig.tenantId} />
}
