'use client'

import { useEffect, useState } from 'react'
import { Bot, CalendarDays, Contact, ExternalLink, LayoutDashboard, LogOut, Menu, Package, Scissors, Settings, Users } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { initialsOf, nowInTimezone } from '@/lib/domain/time'
import type { AdminUser, Appointment, Faq, Product, Professional, Service, Tenant } from '@/lib/domain/types'
import { AppointmentsSection } from './appointments-section'
import { AssistantSection } from './assistant-section'
import { ClientsSection } from './clients-section'
import { OverviewSection } from './overview-section'
import { ProductsSection } from './products-section'
import { ServicesSection } from './services-section'
import { SettingsSection } from './settings-section'
import { TeamSection } from './team-section'
import { Notice } from './ui'

export type AdminData = {
  tenant: Tenant
  appointments: Appointment[]
  services: Service[]
  professionals: Professional[]
  products: Product[]
  faqs: Faq[]
}

const sections = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'appointments', label: 'Citas', icon: CalendarDays },
  { id: 'clients', label: 'Clientes', icon: Contact },
  { id: 'services', label: 'Servicios', icon: Scissors },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'team', label: 'Equipo', icon: Users },
  { id: 'assistant', label: 'Asistente', icon: Bot },
  { id: 'settings', label: 'Configuración', icon: Settings },
] as const

export type SectionId = (typeof sections)[number]['id']

export function AdminShell({ tenant, user }: { tenant: Tenant; user: AdminUser }) {
  const [active, setActive] = useState<SectionId>('overview')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const { admin } = getDataProvider()
    const onError = (error: Error) => {
      console.error('[admin] Error de sincronización', error)
      setLoadError('No se pudieron sincronizar algunos datos en tiempo real.')
    }
    const unsubscribers = [
      admin.subscribeToAppointments(tenant.id, setAppointments, onError),
      admin.subscribeToServices(tenant.id, setServices, onError),
      admin.subscribeToProfessionals(tenant.id, setProfessionals, onError),
      admin.subscribeToProducts(tenant.id, setProducts, onError),
      admin.subscribeToFaqs(tenant.id, setFaqs, onError),
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [tenant.id])

  const data: AdminData = { tenant, appointments, services, professionals, products, faqs }
  const pendingCount = appointments.filter((item) => item.status === 'pending').length
  const go = (id: SectionId) => {
    setActive(id)
    setIsMobileNavOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-slate-900" style={{ '--brand': tenant.profile.accent, '--brand-soft': tenant.profile.accentSoft } as React.CSSProperties}>
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 transition-transform lg:translate-x-0 ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: tenant.profile.accent }}>{tenant.profile.logo || initialsOf(tenant.profile.name)}</div>
          <div className="min-w-0"><p className="truncate text-sm font-bold tracking-tight">{tenant.profile.name}</p><p className="text-[11px] text-slate-400">GESTIÓN DE RESERVAS</p></div>
        </div>
        <nav className="mt-10 flex-1 space-y-1 overflow-y-auto">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Menú principal</p>
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => go(id)} aria-current={active === id ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active === id ? 'bg-(--brand-soft) text-(--brand)' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Icon className="size-[18px]" />{label}
              {id === 'appointments' && pendingCount > 0 && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900"><ExternalLink className="size-4" />Ver página de reservas</a>
      </aside>

      {isMobileNavOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-20 bg-slate-950/20 lg:hidden" onClick={() => setIsMobileNavOpen(false)} />}
      <div className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 px-5 backdrop-blur sm:px-8">
          <button aria-label="Abrir menú" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setIsMobileNavOpen(true)}><Menu className="size-5" /></button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{user.displayName || user.email}</p><p className="text-xs text-slate-400">Administrador</p></div>
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{initialsOf(user.displayName || user.email || '?')}</div>
            <button aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => getDataProvider().auth.signOut()} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><LogOut className="size-4" /></button>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
          {loadError && <div className="mb-6"><Notice>{loadError}</Notice></div>}
          {active === 'overview' && <OverviewSection data={data} onNavigate={go} />}
          {active === 'appointments' && <AppointmentsSection data={data} />}
          {active === 'clients' && <ClientsSection data={data} today={nowInTimezone(tenant.settings.timezone).date} />}
          {active === 'services' && <ServicesSection data={data} />}
          {active === 'products' && <ProductsSection data={data} />}
          {active === 'team' && <TeamSection data={data} />}
          {active === 'assistant' && <AssistantSection data={data} />}
          {active === 'settings' && <SettingsSection tenant={tenant} />}
        </main>
      </div>
    </div>
  )
}
