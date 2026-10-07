import type { Metadata } from 'next'
import { AdminApp } from '@/components/admin/admin-app'
import { appConfig } from '@/config/app'

export const metadata: Metadata = {
  title: `Admin · ${appConfig.appName}`,
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminApp tenantId={appConfig.tenantId} />
}
