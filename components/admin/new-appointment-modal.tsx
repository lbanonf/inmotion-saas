'use client'

import { useEffect, useState } from 'react'
import { getDataProvider } from '@/lib/data'
import { computeAvailability, professionalCanDo } from '@/lib/domain/availability'
import { addDays, formatDate, nowInTimezone } from '@/lib/domain/time'
import type { AdminData } from './admin-shell'
import { Button, errorMessage, Field, inputClass, Modal, Notice } from './ui'

export type AppointmentPrefill = { professionalId?: string; date?: string; time?: string }

export function NewAppointmentModal({ data, prefill, onClose }: { data: AdminData; prefill?: AppointmentPrefill; onClose: () => void }) {
  const { tenant } = data
  const { settings } = tenant
  const services = data.services.filter((item) => item.active)
  const prefilledPro = data.professionals.find((item) => item.id === prefill?.professionalId)
  const [serviceId, setServiceId] = useState((prefilledPro && services.find((item) => professionalCanDo(prefilledPro, item.id))?.id) ?? services[0]?.id ?? '')
  const professionals = data.professionals.filter((item) => item.active && professionalCanDo(item, serviceId))
  const [professionalId, setProfessionalId] = useState(prefilledPro?.id ?? professionals[0]?.id ?? '')
  const [date, setDate] = useState(prefill?.date ?? '')
  const [time, setTime] = useState(prefill?.time ?? '')
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
