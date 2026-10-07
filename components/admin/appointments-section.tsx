'use client'

import { useEffect, useMemo, useState } from 'react'
import { Ban, CalendarDays, Check, MessageCircle, RotateCcw, Search, X } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { computeAvailability, professionalCanDo } from '@/lib/domain/availability'
import { whatsappLink } from '@/lib/domain/contact'
import { addDays, formatDate, formatPrice, initialsOf, nowInTimezone } from '@/lib/domain/time'
import type { Appointment, AppointmentStatus } from '@/lib/domain/types'
import type { AdminData } from './admin-shell'
import { Button, Card, errorMessage, Field, inputClass, Modal, Notice, PageHeader, StatusBadge, statusLabels } from './ui'

type RangeFilter = 'upcoming' | 'today' | 'week' | 'past' | 'all'

const rangeLabels: Record<RangeFilter, string> = {
  upcoming: 'Próximas',
  today: 'Hoy',
  week: 'Próximos 7 días',
  past: 'Pasadas',
  all: 'Todas',
}

export function AppointmentsSection({ data }: { data: AdminData }) {
  const { tenant } = data
  const { settings } = tenant
  const [range, setRange] = useState<RangeFilter>('upcoming')
  const [status, setStatus] = useState<AppointmentStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const today = nowInTimezone(settings.timezone).date
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const inRange = (item: Appointment) => {
      if (range === 'upcoming') return item.date >= today
      if (range === 'today') return item.date === today
      if (range === 'week') return item.date >= today && item.date <= addDays(today, 6)
      if (range === 'past') return item.date < today
      return true
    }
    const list = data.appointments.filter((item) =>
      inRange(item) &&
      (status === 'all' || item.status === status) &&
      (!term || [item.contact.name, item.contact.email, item.contact.phone, item.serviceName, item.professionalName].some((value) => value.toLowerCase().includes(term))),
    )
    // Las futuras en orden cronológico; las pasadas, de la más reciente a la más antigua.
    return range === 'past' || range === 'all' ? list : [...list].reverse()
  }, [data.appointments, range, status, search, today])

  async function changeStatus(appointment: Appointment, next: AppointmentStatus) {
    setUpdatingId(appointment.id)
    setError(null)
    try {
      await getDataProvider().admin.updateAppointmentStatus(tenant.id, appointment, next)
    } catch (updateError) {
      console.error('[admin] No se pudo actualizar el estado', updateError)
      setError(errorMessage(updateError, 'No pudimos actualizar el estado de la cita. Inténtalo de nuevo.'))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Agenda" title="Citas" description="Aprueba, rechaza o registra reservas en un solo lugar." action={<Button onClick={() => setIsCreating(true)} disabled={data.services.length === 0 || data.professionals.length === 0}><CalendarDays className="size-4" />Nueva cita</Button>} />
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(rangeLabels) as RangeFilter[]).map((key) => (
              <button key={key} onClick={() => setRange(key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${range === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{rangeLabels[key]}</button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><input aria-label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, servicio..." className={`${inputClass} pl-9 sm:w-60`} /></div>
            <select aria-label="Estado" value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus | 'all')} className={`${inputClass} sm:w-40`}>
              <option value="all">Todos los estados</option>
              {(Object.keys(statusLabels) as AppointmentStatus[]).map((key) => <option key={key} value={key}>{statusLabels[key]}</option>)}
            </select>
          </div>
        </div>
        <p className="border-b border-slate-100 px-6 py-3 text-xs text-slate-400">{filtered.length} reservas</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr><th className="px-6 py-3.5">Fecha</th><th className="px-4 py-3.5">Cliente</th><th className="px-4 py-3.5">Servicio</th><th className="px-4 py-3.5">Profesional</th><th className="px-4 py-3.5">Estado</th><th className="px-4 py-3.5 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">No hay citas con estos filtros.</td></tr>
              ) : filtered.map((appointment) => {
                const client = appointment.contact.name || 'Sin nombre'
                const busy = updatingId === appointment.id
                const whenText = `${formatDate(appointment.date, settings.locale, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${appointment.time}`
                const chat = whatsappLink(appointment.contact.phone, appointment.status === 'approved'
                  ? `Hola ${client.split(' ')[0]} 🤍 te confirmamos tu cita de ${appointment.serviceName} con ${appointment.professionalName} el ${whenText} en ${tenant.profile.name}. ¡Te esperamos! ✨`
                  : `Hola ${client.split(' ')[0]} 🤍 te escribimos de ${tenant.profile.name} por tu reserva de ${appointment.serviceName} el ${whenText}.`)
                return (
                  <tr key={appointment.id} className="align-top transition hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-6 py-5 text-sm"><p className="font-medium text-slate-700">{formatDate(appointment.date, settings.locale)}</p><p className="text-slate-400">{appointment.time}</p></td>
                    <td className="px-4 py-5">
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--brand-soft) text-xs font-semibold text-(--brand)">{initialsOf(client)}</div>
                        <div className="text-sm"><p className="font-semibold text-slate-700">{client}</p><p className="text-slate-400">{[appointment.contact.phone, appointment.contact.email].filter(Boolean).join(' · ')}</p>{appointment.notes && <p className="mt-1 max-w-xs text-xs text-slate-500 italic">“{appointment.notes}”</p>}</div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-sm text-slate-500"><p>{appointment.serviceName}</p>{appointment.price > 0 && <p className="text-slate-400">{formatPrice(appointment.price, settings.locale, settings.currency)}</p>}</td>
                    <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-500">{appointment.professionalName}</td>
                    <td className="px-4 py-5"><StatusBadge status={appointment.status} />{appointment.source === 'admin' && <p className="mt-1 text-[11px] text-slate-400">Registrada en panel</p>}</td>
                    <td className="px-4 py-5">
                      <div className="flex justify-end gap-1.5">
                        {chat && <a href={chat} target="_blank" rel="noreferrer" aria-label={`Escribir a ${client} por WhatsApp`} title="WhatsApp" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><MessageCircle className="size-4" /></a>}
                        {appointment.status === 'pending' && <IconAction label={`Aprobar cita de ${client}`} disabled={busy} onClick={() => changeStatus(appointment, 'approved')} className="text-emerald-600 hover:bg-emerald-50"><Check className="size-4" /></IconAction>}
                        {appointment.status === 'pending' && <IconAction label={`Rechazar cita de ${client}`} disabled={busy} onClick={() => changeStatus(appointment, 'rejected')} className="text-rose-500 hover:bg-rose-50"><X className="size-4" /></IconAction>}
                        {appointment.status === 'approved' && <IconAction label={`Cancelar cita de ${client}`} disabled={busy} onClick={() => confirm('¿Cancelar esta cita? El horario quedará libre.') && changeStatus(appointment, 'cancelled')} className="text-slate-500 hover:bg-slate-100"><Ban className="size-4" /></IconAction>}
                        {(appointment.status === 'rejected' || appointment.status === 'cancelled') && <IconAction label={`Reactivar cita de ${client}`} disabled={busy} onClick={() => changeStatus(appointment, 'pending')} className="text-slate-500 hover:bg-slate-100"><RotateCcw className="size-4" /></IconAction>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {isCreating && <NewAppointmentModal data={data} onClose={() => setIsCreating(false)} />}
    </>
  )
}

function IconAction({ label, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={`rounded-lg p-2 disabled:opacity-50 ${className}`} {...props} />
}

function NewAppointmentModal({ data, onClose }: { data: AdminData; onClose: () => void }) {
  const { tenant } = data
  const { settings } = tenant
  const services = data.services.filter((item) => item.active)
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const professionals = data.professionals.filter((item) => item.active && professionalCanDo(item, serviceId))
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [notes, setNotes] = useState('')
  const [approved, setApproved] = useState(true)
  const [takenKeys, setTakenKeys] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const today = nowInTimezone(settings.timezone).date
    return getDataProvider().booking.subscribeToSlotLocks(tenant.id, today, addDays(today, settings.bookingWindowDays), (locks) => setTakenKeys(new Set(locks.map((lock) => lock.id))))
  }, [tenant.id, settings.timezone, settings.bookingWindowDays])

  const service = services.find((item) => item.id === serviceId)
  const professional = professionals.find((item) => item.id === professionalId)
  // El panel ignora la antelación mínima: el equipo puede agendar para dentro de un rato.
  const availability = service && professional ? computeAvailability({ settings: { ...settings, minNoticeMinutes: 0 }, service, professionalId: professional.id, professionalHours: professional.weeklyHours, takenKeys }) : []
  const day = availability.find((item) => item.date === date) ?? availability[0]
  const selectedTime = day?.slots.includes(time) ? time : (day?.slots[0] ?? '')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!service || !professional || !day || !selectedTime) return setError('Elige un horario disponible.')
    setBusy(true)
    setError(null)
    try {
      await getDataProvider().booking.createAppointment(tenant.id, { service, professional, date: day.date, time: selectedTime, contact, notes, source: 'admin', status: approved ? 'approved' : 'pending', slotIntervalMinutes: settings.slotIntervalMinutes })
      onClose()
    } catch (createError) {
      console.error('[admin] No se pudo crear la cita', createError)
      setError(errorMessage(createError, 'No pudimos crear la cita. Inténtalo de nuevo.'))
      setBusy(false)
    }
  }

  return (
    <Modal title="Nueva cita" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Servicio">
            <select value={serviceId} onChange={(event) => { setServiceId(event.target.value); setProfessionalId(data.professionals.find((item) => item.active && professionalCanDo(item, event.target.value))?.id ?? '') }} className={inputClass}>
              {services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Profesional">
            <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className={inputClass}>
              {professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Fecha">
            <select value={day?.date ?? ''} onChange={(event) => setDate(event.target.value)} className={inputClass} disabled={availability.length === 0}>
              {availability.length === 0 && <option>Sin disponibilidad</option>}
              {availability.map((item) => <option key={item.date} value={item.date}>{formatDate(item.date, settings.locale, { weekday: 'short', day: 'numeric', month: 'short' })}</option>)}
            </select>
          </Field>
          <Field label="Hora">
            <select value={selectedTime} onChange={(event) => setTime(event.target.value)} className={inputClass} disabled={!day}>
              {day?.slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Nombre del cliente"><input required value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono"><input type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className={inputClass} /></Field>
          <Field label="Correo"><input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className={inputClass} /></Field>
        </div>
        <Field label="Notas"><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} className="size-4 accent-(--brand)" />Marcar como aprobada</label>
        {error && <Notice>{error}</Notice>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy || !selectedTime}>{busy ? 'Guardando...' : 'Crear cita'}</Button></div>
      </form>
    </Modal>
  )
}
