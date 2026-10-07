'use client'

import { useEffect, useState } from 'react'
import { Ban, CalendarDays, ChevronLeft, ChevronRight, Clock3, Lock, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { whatsappLink } from '@/lib/domain/contact'
import { busyItems, dayLoad, startOfWeek, workingRanges, type BusyItem } from '@/lib/domain/schedule'
import { addDays, capitalize, formatDate, formatPrice, initialsOf, minutesToTime, nowInTimezone, timeToMinutes } from '@/lib/domain/time'
import type { AppointmentStatus, Professional } from '@/lib/domain/types'
import type { AdminData } from './admin-shell'
import { NewAppointmentModal, type AppointmentPrefill } from './new-appointment-modal'
import { Button, Card, errorMessage, Field, inputClass, Modal, Notice, PageHeader, StatusBadge } from './ui'

const PX_PER_MINUTE = 1.4
const OFF_HOURS = { backgroundImage: 'repeating-linear-gradient(135deg, #f1f5f9 0 6px, #f8fafc 6px 12px)' }

type View = 'day' | 'week'

type AgendaData = AdminData

export function AgendaSection({ data }: { data: AgendaData }) {
  const { settings } = data.tenant
  const today = useToday(settings.timezone)
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(today.date)
  const [creating, setCreating] = useState<AppointmentPrefill | null>(null)
  const [blocking, setBlocking] = useState<BlockPrefill | null>(null)
  const [slotAction, setSlotAction] = useState<{ professional: Professional; date: string; time: string } | null>(null)
  const [selected, setSelected] = useState<BusyItem | null>(null)

  const team = data.professionals.filter((item) => item.active)
  const step = view === 'day' ? 1 : 7
  const weekStart = startOfWeek(date)
  const title = view === 'day'
    ? capitalize(formatDate(date, settings.locale, { weekday: 'long', day: 'numeric', month: 'long' }))
    : `${formatDate(weekStart, settings.locale, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(weekStart, 6), settings.locale, { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title="Agenda del equipo"
        description="Quién está ocupado, cuándo y cuánto. Toca un espacio libre para agendar o bloquear."
        action={<div className="flex gap-2"><Button variant="outline" onClick={() => setBlocking({ date })}><Lock className="size-4" />Bloquear horario</Button><Button onClick={() => setCreating({ date })} disabled={data.services.length === 0 || team.length === 0}><Plus className="size-4" />Nueva cita</Button></div>}
      />

      <Card className="mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="px-2.5" aria-label="Anterior" onClick={() => setDate(addDays(date, -step))}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" onClick={() => setDate(today.date)}>Hoy</Button>
          <Button variant="outline" className="px-2.5" aria-label="Siguiente" onClick={() => setDate(addDays(date, step))}><ChevronRight className="size-4" /></Button>
          <h2 className="ml-2 font-semibold text-slate-800">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" aria-label="Ir a fecha" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} className={`${inputClass} w-40`} />
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(['day', 'week'] as View[]).map((key) => (
              <button key={key} onClick={() => setView(key)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{key === 'day' ? 'Día' : 'Semana'}</button>
            ))}
          </div>
        </div>
      </Card>

      {team.length === 0 ? <Card><p className="px-6 py-12 text-center text-sm text-slate-400">Agrega profesionales en Equipo para ver su agenda.</p></Card> : view === 'day' ? (
        <DayView data={data} team={team} date={date} now={date === today.date ? today.minutes : null} onSlot={(professional, time) => setSlotAction({ professional, date, time })} onSelect={setSelected} />
      ) : (
        <WeekView data={data} team={team} weekStart={weekStart} today={today.date} onOpenDay={(day) => { setDate(day); setView('day') }} />
      )}

      <Legend />

      {slotAction && (
        <Modal title={`${slotAction.professional.name} · ${slotAction.time}`} onClose={() => setSlotAction(null)}>
          <p className="mb-5 text-sm text-slate-500">{capitalize(formatDate(slotAction.date, settings.locale, { weekday: 'long', day: 'numeric', month: 'long' }))}. ¿Qué quieres hacer en este espacio?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => { setCreating({ professionalId: slotAction.professional.id, date: slotAction.date, time: slotAction.time }); setSlotAction(null) }} className="rounded-2xl border border-slate-200 p-5 text-left hover:border-(--brand) hover:bg-(--brand-soft)">
              <CalendarDays className="mb-3 size-5 text-(--brand)" /><p className="font-semibold">Agendar cita</p><p className="text-sm text-slate-500">Para una clienta que llamó o escribió.</p>
            </button>
            <button onClick={() => { setBlocking({ professionalId: slotAction.professional.id, date: slotAction.date, start: slotAction.time }); setSlotAction(null) }} className="rounded-2xl border border-slate-200 p-5 text-left hover:border-slate-400 hover:bg-slate-50">
              <Lock className="mb-3 size-5 text-slate-500" /><p className="font-semibold">Bloquear horario</p><p className="text-sm text-slate-500">Almuerzo, ausencia o tiempo personal.</p>
            </button>
          </div>
        </Modal>
      )}
      {creating && <NewAppointmentModal data={data} prefill={creating} onClose={() => setCreating(null)} />}
      {blocking && <BlockModal data={data} prefill={blocking} onClose={() => setBlocking(null)} />}
      {selected && <DetailModal data={data} item={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

/** Fecha y minuto actual en la zona del negocio; se actualiza cada minuto. */
function useToday(timezone: string) {
  const [now, setNow] = useState(() => nowInTimezone(timezone))
  useEffect(() => {
    const timer = setInterval(() => setNow(nowInTimezone(timezone)), 60_000)
    return () => clearInterval(timer)
  }, [timezone])
  return now
}

function DayView({ data, team, date, now, onSlot, onSelect }: { data: AgendaData; team: Professional[]; date: string; now: number | null; onSlot: (professional: Professional, time: string) => void; onSelect: (item: BusyItem) => void }) {
  const { settings } = data.tenant
  const interval = settings.slotIntervalMinutes
  const columns = team.map((professional) => ({
    professional,
    ranges: workingRanges(professional, settings, date),
    items: busyItems(professional.id, date, data.appointments, data.timeBlocks),
    load: dayLoad(professional, settings, date, data.appointments, data.timeBlocks),
  }))

  // Rango visible: desde la primera apertura hasta el último cierre (o cita) del día, en horas completas.
  const bounds = columns.flatMap(({ ranges, items }) => [...ranges.flatMap((range) => [timeToMinutes(range.start), timeToMinutes(range.end)]), ...items.flatMap((item) => [item.start, item.end])])
  const dayStart = bounds.length ? Math.floor(Math.min(...bounds) / 60) * 60 : 9 * 60
  const dayEnd = bounds.length ? Math.ceil(Math.max(...bounds) / 60) * 60 : 19 * 60
  const height = (dayEnd - dayStart) * PX_PER_MINUTE
  const top = (minutes: number) => (minutes - dayStart) * PX_PER_MINUTE
  const hours = Array.from({ length: (dayEnd - dayStart) / 60 + 1 }, (_, index) => dayStart + index * 60)

  return (
    <Card className="overflow-x-auto">
      <div className="min-w-fit">
        {/* Cabecera: un profesional por columna, con su carga del día */}
        <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white">
          <div className="w-14 shrink-0" />
          {columns.map(({ professional, ranges, load }) => (
            <div key={professional.id} className="w-60 shrink-0 border-l border-slate-100 px-4 py-3 sm:w-auto sm:min-w-60 sm:flex-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{initialsOf(professional.name)}</div>
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{professional.name}</p><p className="truncate text-xs text-slate-400">{professional.role}</p></div>
              </div>
              {ranges.length === 0 ? <p className="mt-3 text-xs font-medium text-slate-400">No trabaja este día</p> : (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>{ranges.map((range) => `${range.start}–${range.end}`).join(' · ')}</span><span className="font-semibold text-slate-700">{load.occupancy}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-(--brand) transition-all" style={{ width: `${Math.min(100, load.occupancy)}%` }} /></div>
                  <p className="mt-1 text-[11px] text-slate-400">{load.appointments} {load.appointments === 1 ? 'cita' : 'citas'} · {Math.round((load.workMinutes - load.busyMinutes) / 6) / 10} h libres</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Cuerpo: línea de tiempo */}
        <div className="relative mt-3 mb-3 flex" style={{ height }}>
          <div className="relative w-14 shrink-0">
            {hours.map((minutes) => <span key={minutes} className="absolute right-2 -translate-y-1/2 text-[11px] text-slate-400" style={{ top: top(minutes) }}>{minutesToTime(minutes)}</span>)}
          </div>
          {columns.map(({ professional, ranges, items }) => (
            <div key={professional.id} className="relative w-60 shrink-0 border-l border-slate-100 sm:w-auto sm:min-w-60 sm:flex-1" style={OFF_HOURS}>
              {ranges.map((range) => <div key={range.start} className="absolute inset-x-0 bg-white" style={{ top: top(timeToMinutes(range.start)), height: (timeToMinutes(range.end) - timeToMinutes(range.start)) * PX_PER_MINUTE }} />)}
              {hours.map((minutes) => <div key={minutes} className="pointer-events-none absolute inset-x-0 border-t border-slate-100" style={{ top: top(minutes) }} />)}
              {ranges.flatMap((range) => {
                const slots = []
                for (let start = timeToMinutes(range.start); start + interval <= timeToMinutes(range.end); start += interval) {
                  if (items.some((item) => start < item.end && start + interval > item.start)) continue
                  const time = minutesToTime(start)
                  slots.push(
                    <button key={start} aria-label={`Espacio libre ${time} con ${professional.name}`} onClick={() => onSlot(professional, time)} className="group absolute inset-x-1 rounded-md text-left transition hover:bg-(--brand-soft)" style={{ top: top(start) + 1, height: interval * PX_PER_MINUTE - 2 }}>
                      <span className="hidden px-2 text-[11px] font-medium text-(--brand) group-hover:inline">+ {time}</span>
                    </button>,
                  )
                }
                return slots
              })}
              {items.map((item) => <BusyCard key={item.kind === 'appointment' ? item.appointment.id : item.block.id} item={item} top={top(item.start)} height={(item.end - item.start) * PX_PER_MINUTE} onClick={() => onSelect(item)} />)}
            </div>
          ))}
          {now !== null && now >= dayStart && now <= dayEnd && (
            <div className="pointer-events-none absolute right-0 left-12 z-[5] flex items-center" style={{ top: top(now) }}>
              <span className="size-2 rounded-full bg-rose-500" /><span className="h-px flex-1 bg-rose-500" />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

const statusCard: Record<'pending' | 'approved', string> = {
  approved: 'border-(--brand) bg-(--brand-soft) text-slate-800',
  pending: 'border-amber-400 bg-amber-50 text-amber-900',
}

function BusyCard({ item, top, height, onClick }: { item: BusyItem; top: number; height: number; onClick: () => void }) {
  const compact = height < 44
  if (item.kind === 'block') {
    return (
      <button onClick={onClick} className="absolute inset-x-1 z-[2] flex flex-col justify-start overflow-hidden rounded-lg border border-slate-300 bg-slate-200/80 px-2 py-1 text-left text-slate-600" style={{ top: top + 1, height: height - 2, ...OFF_HOURS }}>
        <p className="flex items-center gap-1 truncate text-xs font-semibold"><Lock className="size-3 shrink-0" />{item.block.reason || 'Bloqueado'}</p>
        {!compact && <p className="text-[11px]">{item.block.start}–{item.block.end}</p>}
      </button>
    )
  }
  const { appointment } = item
  const style = statusCard[appointment.status === 'approved' ? 'approved' : 'pending']
  return (
    <button onClick={onClick} className={`absolute inset-x-1 z-[2] flex flex-col justify-start overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left shadow-sm transition hover:shadow-md ${style}`} style={{ top: top + 1, height: height - 2 }}>
      <p className="truncate text-xs font-semibold">{compact ? `${appointment.time} ${appointment.contact.name}` : appointment.contact.name || 'Sin nombre'}</p>
      {!compact && <p className="truncate text-[11px] opacity-80">{appointment.time}–{minutesToTime(item.end)} · {appointment.serviceName}</p>}
      {!compact && appointment.status === 'pending' && <p className="text-[10px] font-semibold tracking-wide uppercase">Por aprobar</p>}
    </button>
  )
}

function WeekView({ data, team, weekStart, today, onOpenDay }: { data: AgendaData; team: Professional[]; weekStart: string; today: string; onOpenDay: (date: string) => void }) {
  const { settings } = data.tenant
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[980px] table-fixed text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="w-48 px-4 py-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Profesional</th>
            {days.map((day) => (
              <th key={day} className={`px-2 py-3 text-center text-xs font-medium ${day === today ? 'text-(--brand)' : 'text-slate-500'}`}>
                <span className="block capitalize">{formatDate(day, settings.locale, { weekday: 'short' })}</span>
                <span className={`mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold ${day === today ? 'bg-(--brand) text-white' : 'text-slate-800'}`}>{Number(day.slice(8))}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {team.map((professional) => {
            const loads = days.map((day) => ({ day, ranges: workingRanges(professional, settings, day), items: busyItems(professional.id, day, data.appointments, data.timeBlocks), load: dayLoad(professional, settings, day, data.appointments, data.timeBlocks) }))
            const week = loads.reduce((total, { load }) => ({ work: total.work + load.workMinutes, busy: total.busy + load.busyMinutes }), { work: 0, busy: 0 })
            return (
              <tr key={professional.id}>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm font-semibold">{professional.name}</p>
                  <p className="text-xs text-slate-400">{professional.role}</p>
                  <p className="mt-2 text-xs text-slate-500">Semana: <span className="font-semibold text-slate-800">{week.work ? Math.round((week.busy / week.work) * 100) : 0}%</span> ocupado</p>
                </td>
                {loads.map(({ day, ranges, items, load }) => (
                  <td key={day} className="p-1.5 align-top">
                    <button onClick={() => onOpenDay(day)} className={`h-full min-h-24 w-full rounded-xl border p-2 text-left transition hover:border-(--brand) ${day === today ? 'border-(--brand-soft)' : 'border-slate-100'}`} style={ranges.length === 0 ? OFF_HOURS : undefined}>
                      {ranges.length === 0 ? <p className="text-[11px] text-slate-400">No trabaja</p> : (
                        <>
                          <div className="flex items-baseline justify-between gap-1"><span className="text-[10px] whitespace-nowrap text-slate-400">{ranges[0].start}–{ranges[ranges.length - 1].end}</span><span className={`text-xs font-bold ${load.occupancy >= 80 ? 'text-rose-600' : load.occupancy >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{load.occupancy}%</span></div>
                          <MiniTimeline ranges={ranges} items={items} />
                          <p className="mt-1.5 text-[11px] text-slate-500">{load.appointments ? `${load.appointments} ${load.appointments === 1 ? 'cita' : 'citas'}` : 'Sin citas'}</p>
                        </>
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

/** Barra horizontal del horario del día con los tramos ocupados pintados. */
function MiniTimeline({ ranges, items }: { ranges: { start: string; end: string }[]; items: BusyItem[] }) {
  const start = timeToMinutes(ranges[0].start)
  const total = timeToMinutes(ranges[ranges.length - 1].end) - start
  const pct = (minutes: number) => `${Math.max(0, Math.min(100, ((minutes - start) / total) * 100))}%`
  return (
    <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
      {items.map((item, index) => {
        const color = item.kind === 'block' ? 'bg-slate-400' : item.appointment.status === 'approved' ? 'bg-(--brand)' : 'bg-amber-400'
        return <span key={index} className={`absolute inset-y-0 ${color}`} style={{ left: pct(item.start), width: `calc(${pct(item.end)} - ${pct(item.start)})` }} />
      })}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-l-4 border-(--brand) bg-(--brand-soft)" />Aprobada</span>
      <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-l-4 border-amber-400 bg-amber-50" />Por aprobar</span>
      <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-slate-300" />Bloqueado</span>
      <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-slate-200" style={OFF_HOURS} />Fuera de horario</span>
    </div>
  )
}

function DetailModal({ data, item, onClose }: { data: AgendaData; item: BusyItem; onClose: () => void }) {
  const { tenant } = data
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onClose()
    } catch (actionError) {
      setError(errorMessage(actionError, 'No se pudo completar la acción.'))
      setBusy(false)
    }
  }

  if (item.kind === 'block') {
    const professional = data.professionals.find((pro) => pro.id === item.block.professionalId)
    return (
      <Modal title="Horario bloqueado" onClose={onClose}>
        <p className="font-semibold">{item.block.reason || 'Bloqueado'}</p>
        <p className="mt-1 text-sm text-slate-500">{professional?.name} · {capitalize(formatDate(item.block.date, tenant.settings.locale, { weekday: 'long', day: 'numeric', month: 'long' }))} · {item.block.start}–{item.block.end}</p>
        {error && <div className="mt-4"><Notice>{error}</Notice></div>}
        <div className="mt-6 flex justify-end"><Button variant="danger" disabled={busy} onClick={() => run(() => getDataProvider().admin.deleteTimeBlock(tenant.id, item.block))}><Trash2 className="size-4" />Quitar bloqueo</Button></div>
      </Modal>
    )
  }

  const { appointment } = item
  const change = (status: AppointmentStatus) => run(() => getDataProvider().admin.updateAppointmentStatus(tenant.id, appointment, status))
  const firstName = appointment.contact.name.split(' ')[0]
  const when = `${formatDate(appointment.date, tenant.settings.locale, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${appointment.time}`
  const chat = whatsappLink(appointment.contact.phone, appointment.status === 'approved'
    ? `Hola ${firstName} 🤍 te confirmamos tu cita de ${appointment.serviceName} con ${appointment.professionalName} el ${when} en ${tenant.profile.name}. ¡Te esperamos! ✨`
    : `Hola ${firstName} 🤍 te escribimos de ${tenant.profile.name} por tu reserva de ${appointment.serviceName} el ${when}.`)

  return (
    <Modal title="Detalle de la cita" onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{appointment.contact.name || 'Sin nombre'}</p>
          <p className="text-sm text-slate-500">{[appointment.contact.phone, appointment.contact.email].filter(Boolean).join(' · ')}</p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-slate-400">Servicio</dt><dd className="font-medium">{appointment.serviceName}</dd></div>
        <div><dt className="text-xs text-slate-400">Profesional</dt><dd className="font-medium">{appointment.professionalName}</dd></div>
        <div><dt className="text-xs text-slate-400">Horario</dt><dd className="flex items-center gap-1 font-medium"><Clock3 className="size-3.5" />{appointment.time}–{minutesToTime(item.end)}</dd></div>
        <div><dt className="text-xs text-slate-400">Precio</dt><dd className="font-medium">{formatPrice(appointment.price, tenant.settings.locale, tenant.settings.currency)}</dd></div>
        {appointment.notes && <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Notas</dt><dd>{appointment.notes}</dd></div>}
      </dl>
      {error && <div className="mt-4"><Notice>{error}</Notice></div>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {chat && <a href={chat} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><MessageCircle className="size-4" />WhatsApp</a>}
        {appointment.status === 'pending' && <Button variant="outline" disabled={busy} onClick={() => change('rejected')}>Rechazar</Button>}
        {appointment.status === 'pending' && <Button disabled={busy} onClick={() => change('approved')}>Aprobar</Button>}
        {appointment.status === 'approved' && <Button variant="outline" disabled={busy} onClick={() => confirm('¿Cancelar esta cita? El horario quedará libre.') && change('cancelled')}><Ban className="size-4" />Cancelar cita</Button>}
      </div>
    </Modal>
  )
}

type BlockPrefill = { professionalId?: string; date?: string; start?: string }

const REASONS = ['Almuerzo', 'Descanso', 'Ausencia', 'Vacaciones', 'Capacitación', 'Personal']

function BlockModal({ data, prefill, onClose }: { data: AgendaData; prefill: BlockPrefill; onClose: () => void }) {
  const { tenant } = data
  const { settings } = tenant
  const team = data.professionals.filter((item) => item.active)
  const [professionalId, setProfessionalId] = useState(prefill.professionalId ?? team[0]?.id ?? '')
  const [date, setDate] = useState(prefill.date ?? nowInTimezone(settings.timezone).date)
  const [until, setUntil] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState(prefill.start ?? '13:00')
  const [end, setEnd] = useState(minutesToTime(timeToMinutes(prefill.start ?? '13:00') + 60))
  const [reason, setReason] = useState('Almuerzo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const professional = team.find((item) => item.id === professionalId)
    if (!professional) return setError('Elige un profesional.')
    const last = until && until > date ? until : date
    const dates: string[] = []
    for (let day = date; day <= last; day = addDays(day, 1)) dates.push(day)
    if (dates.length > 60) return setError('Bloquea como máximo 60 días a la vez.')

    setBusy(true)
    setError(null)
    const failed: string[] = []
    let created = 0
    for (const day of dates) {
      const ranges = workingRanges(professional, settings, day)
      if (ranges.length === 0) continue
      const pieces = allDay ? ranges : [{ start, end }]
      for (const piece of pieces) {
        try {
          await getDataProvider().admin.createTimeBlock(tenant.id, { professionalId, date: day, start: piece.start, end: piece.end, reason, slotIntervalMinutes: settings.slotIntervalMinutes })
          created++
        } catch {
          failed.push(formatDate(day, settings.locale, { day: 'numeric', month: 'short' }))
        }
      }
    }
    setBusy(false)
    if (failed.length) setError(`${created} bloqueos creados. No se pudo bloquear ${[...new Set(failed)].join(', ')}: ya hay citas en ese horario. Muévelas o cancélalas primero.`)
    else if (created === 0) setError(`${professional.name} no trabaja en esas fechas.`)
    else onClose()
  }

  return (
    <Modal title="Bloquear horario" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-sm text-slate-500">Las horas bloqueadas dejan de ofrecerse en la página de reservas.</p>
        <Field label="Profesional">
          <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className={inputClass}>{team.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </Field>
        <Field label="Motivo">
          <div className="flex flex-wrap gap-1.5">{REASONS.map((item) => <button type="button" key={item} onClick={() => { setReason(item); if (item === 'Vacaciones' || item === 'Ausencia') setAllDay(true) }} className={`rounded-full border px-3 py-1 text-xs ${reason === item ? 'border-(--brand) bg-(--brand-soft) text-slate-900' : 'border-slate-200 text-slate-600'}`}>{item}</button>)}</div>
          <input value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Desde"><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></Field>
          <Field label="Hasta (opcional)" hint="Para repetir varios días o vacaciones."><input type="date" min={date} value={until} onChange={(event) => setUntil(event.target.value)} className={inputClass} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} className="size-4 accent-(--brand)" />Todo el día</label>
        {!allDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inicio"><input type="time" required step={settings.slotIntervalMinutes * 60} value={start} onChange={(event) => setStart(event.target.value)} className={inputClass} /></Field>
            <Field label="Fin"><input type="time" required value={end} onChange={(event) => setEnd(event.target.value)} className={inputClass} /></Field>
          </div>
        )}
        {error && <Notice>{error}</Notice>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button><Button type="submit" disabled={busy || (!allDay && end <= start)}>{busy ? 'Bloqueando...' : 'Bloquear'}</Button></div>
      </form>
    </Modal>
  )
}
