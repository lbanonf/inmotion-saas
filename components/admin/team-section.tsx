'use client'

import { useState } from 'react'
import { AtSign, Clock3, Pencil, Plus, Trash2 } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { rangeMinutes } from '@/lib/domain/schedule'
import { initialsOf } from '@/lib/domain/time'
import { WEEKDAYS, type Professional, type ProfessionalInput, type Service, type WeeklyHours } from '@/lib/domain/types'
import type { AdminData } from './admin-shell'
import { HoursEditor, validateHours, weekdayLabels } from './hours-editor'
import { Button, Card, errorMessage, Field, inputClass, Modal, Notice, PageHeader } from './ui'

export function TeamSection({ data }: { data: AdminData }) {
  const { tenant, professionals, services } = data
  const [editing, setEditing] = useState<Professional | 'new' | null>(null)
  const [scheduling, setScheduling] = useState<Professional | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(professional: Professional) {
    if (!confirm(`¿Eliminar a ${professional.name}? Sus citas existentes no se modifican.`)) return
    try {
      await getDataProvider().admin.deleteProfessional(tenant.id, professional.id)
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'No se pudo eliminar al profesional.'))
    }
  }

  const serviceNames = (professional: Professional) =>
    professional.serviceIds.length === 0 ? 'Todos los servicios' : services.filter((item) => professional.serviceIds.includes(item.id)).map((item) => item.name).join(', ')

  return (
    <>
      <PageHeader eyebrow="Equipo" title="Profesionales" description="Quién atiende y qué servicios puede realizar." action={<Button onClick={() => setEditing('new')}><Plus className="size-4" />Nuevo profesional</Button>} />
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}
      {professionals.length > 0 && <ScheduleMatrix professionals={professionals} businessHours={tenant.settings.weeklyHours} onEdit={setScheduling} />}
      {professionals.length === 0 ? <Card><p className="px-6 py-12 text-center text-sm text-slate-400">Aún no hay profesionales.</p></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {professionals.map((professional) => (
            <Card key={professional.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{initialsOf(professional.name)}</div>
                <div className="flex gap-1">
                  <Button variant="ghost" className="px-2.5" aria-label={`Editar ${professional.name}`} onClick={() => setEditing(professional)}><Pencil className="size-4" /></Button>
                  <Button variant="danger" className="px-2.5" aria-label={`Eliminar ${professional.name}`} onClick={() => remove(professional)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
              <p className="mt-4 font-semibold text-slate-800">{professional.name} {!professional.active && <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Inactivo</span>}</p>
              <p className="text-sm text-slate-500">{professional.role}</p>
              {professional.bio && <p className="mt-2 text-sm text-slate-500">{professional.bio}</p>}
              <div className="mt-3 grid gap-1 text-xs text-slate-400">
                <p>{serviceNames(professional)}</p>
                <p className="flex items-center gap-1"><Clock3 className="size-3" />{professional.weeklyHours ? 'Horario propio' : 'Horario del negocio'}</p>
                {professional.instagram && <a href={`https://instagram.com/${professional.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-(--brand)"><AtSign className="size-3" />{professional.instagram}</a>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {scheduling && <ScheduleForm tenantId={tenant.id} professional={scheduling} businessHours={tenant.settings.weeklyHours} onClose={() => setScheduling(null)} />}
      {editing && <ProfessionalForm tenantId={tenant.id} businessHours={tenant.settings.weeklyHours} professional={editing === 'new' ? null : editing} services={services} nextOrder={professionals.length + 1} onClose={() => setEditing(null)} />}
    </>
  )
}

function ProfessionalForm({ tenantId, businessHours, professional, services, nextOrder, onClose }: { tenantId: string; businessHours: WeeklyHours; professional: Professional | null; services: Service[]; nextOrder: number; onClose: () => void }) {
  const [form, setForm] = useState<ProfessionalInput>(professional ?? { name: '', role: '', bio: '', instagram: '', active: true, order: nextOrder, serviceIds: [], weeklyHours: null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleService(id: string) {
    setForm((current) => ({ ...current, serviceIds: current.serviceIds.includes(id) ? current.serviceIds.filter((item) => item !== id) : [...current.serviceIds, id] }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const invalid = form.weeklyHours && validateHours(form.weeklyHours)
    if (invalid) return setError(invalid)
    setBusy(true)
    try {
      const { name, role, bio, instagram, active, order, serviceIds, weeklyHours } = form
      await getDataProvider().admin.saveProfessional(tenantId, { name: name.trim(), role: role.trim(), bio: bio.trim(), instagram: instagram.trim().replace(/^@/, ''), active, order, serviceIds, weeklyHours }, professional?.id)
      onClose()
    } catch (saveError) {
      setError(errorMessage(saveError, 'No se pudo guardar el profesional.'))
      setBusy(false)
    }
  }

  return (
    <Modal title={professional ? 'Editar profesional' : 'Nuevo profesional'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Nombre"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
          <Field label="Rol"><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className={inputClass} placeholder="Stylist senior" /></Field>
          <Field label="Orden"><input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} className={inputClass} /></Field>
        </div>
        <Field label="Bio corta"><textarea rows={2} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className={inputClass} /></Field>
        <Field label="Instagram"><input value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} className={inputClass} placeholder="usuario (sin @)" /></Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Servicios que realiza <span className="font-normal text-slate-400">(ninguno marcado = todos)</span></legend>
          {services.map((service) => (
            <label key={service.id} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} className="size-4 accent-(--brand)" />{service.name}</label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.weeklyHours !== null} onChange={(event) => setForm({ ...form, weeklyHours: event.target.checked ? businessHours : null })} className="size-4 accent-(--brand)" />Tiene un horario distinto al del negocio</label>
        {form.weeklyHours && <div className="rounded-xl border border-slate-200 px-3"><HoursEditor value={form.weeklyHours} onChange={(weeklyHours) => setForm({ ...form, weeklyHours })} /></div>}
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="size-4 accent-(--brand)" />Disponible para reservas</label>
        {error && <Notice>{error}</Notice>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</Button></div>
      </form>
    </Modal>
  )
}

function hoursLabel(ranges: WeeklyHours[keyof WeeklyHours]) {
  return ranges.map((range) => `${range.start}–${range.end}`).join(', ')
}

function weeklyTotal(hours: WeeklyHours) {
  return Math.round(WEEKDAYS.reduce((total, day) => total + rangeMinutes(hours[day]), 0) / 6) / 10
}

/** Horario semanal de todo el equipo de un vistazo. */
function ScheduleMatrix({ professionals, businessHours, onEdit }: { professionals: Professional[]; businessHours: WeeklyHours; onEdit: (professional: Professional) => void }) {
  return (
    <Card className="mb-6 overflow-x-auto">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div><h2 className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-(--brand)" />Horarios del equipo</h2><p className="text-xs text-slate-400">Qué días y en qué rango atiende cada uno. Toca un horario para editarlo.</p></div>
      </div>
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          <tr><th className="px-6 py-3">Profesional</th>{WEEKDAYS.map((day) => <th key={day} className="px-2 py-3 text-center">{weekdayLabels[day].slice(0, 3)}</th>)}<th className="px-4 py-3 text-right">Horas/sem</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {professionals.map((professional) => {
            const hours = professional.weeklyHours ?? businessHours
            return (
              <tr key={professional.id} className="hover:bg-slate-50/60">
                <td className="px-6 py-3">
                  <button onClick={() => onEdit(professional)} className="text-left">
                    <p className="font-semibold text-slate-800 hover:text-(--brand)">{professional.name}</p>
                    <p className="text-xs text-slate-400">{professional.weeklyHours ? 'Horario propio' : 'Horario del negocio'}</p>
                  </button>
                </td>
                {WEEKDAYS.map((day) => (
                  <td key={day} className="px-1.5 py-2 text-center">
                    <button onClick={() => onEdit(professional)} className={`w-full rounded-lg px-1.5 py-2 text-[11px] leading-4 whitespace-pre-line ${hours[day].length ? 'bg-(--brand-soft) font-medium text-slate-800' : 'text-slate-300'}`}>
                      {hours[day].length ? hoursLabel(hours[day]).replace(/, /g, '\n') : 'Libre'}
                    </button>
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{weeklyTotal(hours)} h</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function ScheduleForm({ tenantId, professional, businessHours, onClose }: { tenantId: string; professional: Professional; businessHours: WeeklyHours; onClose: () => void }) {
  const [custom, setCustom] = useState(professional.weeklyHours !== null)
  const [hours, setHours] = useState<WeeklyHours>(professional.weeklyHours ?? businessHours)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const invalid = custom && validateHours(hours)
    if (invalid) return setError(invalid)
    setBusy(true)
    try {
      const { id, ...rest } = professional
      await getDataProvider().admin.saveProfessional(tenantId, { ...rest, weeklyHours: custom ? hours : null }, id)
      onClose()
    } catch (saveError) {
      setError(errorMessage(saveError, 'No se pudo guardar el horario.'))
      setBusy(false)
    }
  }

  return (
    <Modal title={`Horario de ${professional.name}`} onClose={onClose}>
      <div className="grid gap-4">
        <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
          <button onClick={() => setCustom(false)} className={`flex-1 rounded-lg px-3 py-2 font-medium ${!custom ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Usar horario del negocio</button>
          <button onClick={() => setCustom(true)} className={`flex-1 rounded-lg px-3 py-2 font-medium ${custom ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Horario propio</button>
        </div>
        {custom ? <HoursEditor value={hours} onChange={setHours} /> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{professional.name} atenderá en el horario general del negocio (Configuración). Si cambias ese horario, el suyo cambia también.</p>}
        <p className="text-xs text-slate-400">Para un día puntual (almuerzo, ausencia o vacaciones) usa <span className="font-medium">Bloquear horario</span> en la Agenda.</p>
        {error && <Notice>{error}</Notice>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={busy}>{busy ? 'Guardando...' : 'Guardar horario'}</Button></div>
      </div>
    </Modal>
  )
}
