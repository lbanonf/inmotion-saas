'use client'

import { ArrowRight, CalendarDays, Check, Clock3, Wallet } from 'lucide-react'
import { addDays, formatDate, formatPrice, nowInTimezone } from '@/lib/domain/time'
import { BLOCKING_STATUSES } from '@/lib/domain/types'
import type { AdminData, SectionId } from './admin-shell'
import { Card, PageHeader, StatusBadge } from './ui'

export function OverviewSection({ data, onNavigate }: { data: AdminData; onNavigate: (id: SectionId) => void }) {
  const { settings } = data.tenant
  const today = nowInTimezone(settings.timezone).date
  const weekEnd = addDays(today, 6)
  const month = today.slice(0, 7)
  const active = data.appointments.filter((item) => BLOCKING_STATUSES.includes(item.status))
  const upcoming = active.filter((item) => item.date >= today).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  const revenue = data.appointments.filter((item) => item.status === 'approved' && item.date.startsWith(month)).reduce((total, item) => total + item.price, 0)

  const setupMissing = [
    data.services.length === 0 && 'servicios',
    data.professionals.length === 0 && 'profesionales',
  ].filter(Boolean)

  return (
    <>
      <PageHeader eyebrow="Resumen" title={`Hola, ${data.tenant.profile.name}`} description={`Hoy es ${formatDate(today, settings.locale, { weekday: 'long', day: 'numeric', month: 'long' })}.`} />
      {setupMissing.length > 0 && (
        <Card className="mb-6 flex flex-col gap-3 border-(--brand-soft) bg-(--brand-soft) p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-(--brand)">Para recibir reservas agrega {setupMissing.join(' y ')}.</p>
          <button onClick={() => onNavigate(data.services.length === 0 ? 'services' : 'team')} className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand)">Configurar <ArrowRight className="size-4" /></button>
        </Card>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} label="Citas hoy" value={active.filter((item) => item.date === today).length} accent="violet" />
        <StatCard icon={Check} label="Próximos 7 días" value={upcoming.filter((item) => item.date <= weekEnd).length} accent="emerald" />
        <StatCard icon={Clock3} label="Pendientes de aprobar" value={data.appointments.filter((item) => item.status === 'pending').length} accent="amber" />
        <StatCard icon={Wallet} label="Ingresos aprobados del mes" value={formatPrice(revenue, settings.locale, settings.currency)} accent="slate" />
      </div>
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-900">Próximas citas</h2>
          <button onClick={() => onNavigate('appointments')} className="inline-flex items-center gap-1 text-sm font-medium text-(--brand)">Ver todas <ArrowRight className="size-4" /></button>
        </div>
        {upcoming.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-400">No hay citas próximas.</p> : (
          <ul className="divide-y divide-slate-100">
            {upcoming.slice(0, 6).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-sm">
                <span className="w-32 font-medium text-slate-700">{formatDate(item.date, settings.locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {item.time}</span>
                <span className="min-w-40 flex-1 font-semibold text-slate-800">{item.contact.name || 'Sin nombre'}</span>
                <span className="text-slate-500">{item.serviceName} · {item.professionalName}</span>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

export function StatCard({ icon: Icon, label, value, accent }: { icon: typeof CalendarDays; label: string; value: number | string; accent: 'violet' | 'amber' | 'emerald' | 'slate' }) {
  const styles = { violet: 'bg-(--brand-soft) text-(--brand)', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', slate: 'bg-slate-100 text-slate-600' }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{typeof value === 'number' ? String(value).padStart(2, '0') : value}</p></div>
        <div className={`rounded-xl p-2.5 ${styles[accent]}`}><Icon className="size-5" /></div>
      </div>
    </Card>
  )
}
