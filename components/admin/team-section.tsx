'use client'

import { useState } from 'react'
import { AtSign, Clock3, Pencil, Plus, Trash2 } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { initialsOf } from '@/lib/domain/time'
import type { Professional, ProfessionalInput, Service, WeeklyHours } from '@/lib/domain/types'
import type { AdminData } from './admin-shell'
import { HoursEditor, validateHours } from './hours-editor'
import { Button, Card, errorMessage, Field, inputClass, Modal, Notice, PageHeader } from './ui'

export function TeamSection({ data }: { data: AdminData }) {
  const { tenant, professionals, services } = data
  const [editing, setEditing] = useState<Professional | 'new' | null>(null)
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
