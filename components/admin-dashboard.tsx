'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  Menu,
  Scissors,
  Settings,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import {
  subscribeToAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/appointments'

export type AdminDashboardProps = {
  salonId: string
}

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const statusStyles: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function formatAppointmentDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date

  return parsed.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function AdminDashboard({ salonId }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState('Citas')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToAppointments(
      salonId,
      (nextAppointments) => {
        setAppointments(nextAppointments)
        setLoadError(null)
      },
      (error) => {
        console.error('[admin] No se pudieron leer las citas', error)
        setLoadError('No se pudieron cargar las citas en tiempo real.')
      },
    )

    return unsubscribe
  }, [salonId])

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    setUpdatingId(id)

    try {
      await updateAppointmentStatus(id, status)
    } catch (error) {
      console.error('[admin] No se pudo actualizar el estado', error)
      alert('No pudimos actualizar el estado de la cita. Inténtalo de nuevo.')
    } finally {
      setUpdatingId(null)
    }
  }

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Citas', icon: CalendarDays },
    { label: 'Configuración', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 transition-transform lg:translate-x-0 ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Scissors className="size-5" /></div>
          <div><p className="text-sm font-bold tracking-tight">atelier</p><p className="text-[11px] text-slate-400">GESTIÓN DE SALÓN</p></div>
        </div>
        <div className="mt-12 flex-1 space-y-1">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Menú principal</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => { setActiveSection(label); setIsMobileNavOpen(false) }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${activeSection === label ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Icon className="size-[18px]" />{label}
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-violet-50 p-4"><div className="mb-3 flex size-9 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Sparkles className="size-4" /></div><p className="text-xs font-semibold text-violet-900">Tu salón, más simple</p><p className="mt-1 text-[11px] leading-4 text-violet-700">Gestiona tus citas sin perder ningún detalle.</p></div>
      </aside>

      {isMobileNavOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-20 bg-slate-950/20 lg:hidden" onClick={() => setIsMobileNavOpen(false)} />}
      <div className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 px-5 backdrop-blur sm:px-8">
          <button aria-label="Abrir menú" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setIsMobileNavOpen(true)}><Menu className="size-5" /></button>
          <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex"><span>Espacio de trabajo</span><ChevronDown className="size-4" /></div>
          <div className="ml-auto flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">Laura Méndez</p><p className="text-xs text-slate-400">Administradora</p></div><div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">LM</div></div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
          {activeSection === 'Citas' ? <>
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Agenda</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">Citas</h1><p className="mt-2 text-sm text-slate-500">Administra las reservas de tu salón en un solo lugar.</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"><CalendarDays className="size-4" /> Nueva cita</button></div>
            {loadError ? <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p> : null}
            <div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard icon={CalendarDays} label="Citas este mes" value={String(appointments.length).padStart(2, '0')} accent="violet" /><StatCard icon={Clock3} label="Pendientes" value={String(appointments.filter((item) => item.status === 'pending').length).padStart(2, '0')} accent="amber" /><StatCard icon={Check} label="Aprobadas" value={String(appointments.filter((item) => item.status === 'approved').length).padStart(2, '0')} accent="emerald" /></div>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><h2 className="font-semibold text-slate-900">Próximas citas</h2><p className="mt-1 text-xs text-slate-400">{appointments.length} reservas encontradas</p></div><div className="flex items-center gap-2"><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Esta semana <ChevronDown className="ml-1 inline size-3" /></button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-3.5">Fecha</th><th className="px-4 py-3.5">Hora</th><th className="px-4 py-3.5">Cliente</th><th className="px-4 py-3.5">Servicio</th><th className="px-4 py-3.5">Profesional</th><th className="px-4 py-3.5">Estado</th><th className="px-4 py-3.5 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{appointments.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">Aún no hay citas en Firestore.</td></tr> : appointments.map((appointment) => { const client = appointment.contact.name || 'Sin nombre'; return <tr key={appointment.id} className="transition hover:bg-slate-50/60"><td className="whitespace-nowrap px-6 py-5 text-sm font-medium text-slate-700">{formatAppointmentDate(appointment.date)}</td><td className="whitespace-nowrap px-4 py-5 text-sm text-slate-500">{appointment.time}</td><td className="whitespace-nowrap px-4 py-5"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">{client.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><span className="text-sm font-semibold text-slate-700">{client}</span></div></td><td className="whitespace-nowrap px-4 py-5 text-sm text-slate-500">{appointment.service}</td><td className="whitespace-nowrap px-4 py-5 text-sm text-slate-500">{appointment.professional}</td><td className="px-4 py-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[appointment.status]}`}>{statusLabels[appointment.status]}</span></td><td className="px-4 py-5"><div className="flex justify-end gap-1.5">{appointment.status !== 'approved' && <button aria-label={`Aprobar cita de ${client}`} disabled={updatingId === appointment.id} onClick={() => updateStatus(appointment.id, 'approved')} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"><Check className="size-4" /></button>}{appointment.status !== 'rejected' && <button aria-label={`Rechazar cita de ${client}`} disabled={updatingId === appointment.id} onClick={() => updateStatus(appointment.id, 'rejected')} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-50"><X className="size-4" /></button>}</div></td></tr> })}</tbody></table></div></section>
          </> : <EmptySection title={activeSection} />}
        </main>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof CalendarDays; label: string; value: string; accent: 'violet' | 'amber' | 'emerald' }) {
  const styles = { violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600' }
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div><div className={`rounded-xl p-2.5 ${styles[accent]}`}><Icon className="size-5" /></div></div></div>
}

function EmptySection({ title }: { title: string }) {
  return <div className="flex min-h-[55vh] flex-col items-center justify-center text-center"><div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><UserRound className="size-6" /></div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-sm text-slate-500">Esta sección estará disponible próximamente.</p></div>
}

export default AdminDashboard

