'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { formatDuration, formatPrice } from '@/lib/domain/time'
import type { Service, ServiceInput } from '@/lib/domain/types'
import type { AdminData } from './admin-shell'
import { CsvImportModal, toNumber } from './csv-import'
import { Button, Card, errorMessage, Field, inputClass, Modal, Notice, PageHeader } from './ui'

export function ServicesSection({ data }: { data: AdminData }) {
  const { tenant, services } = data
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove(service: Service) {
    if (!confirm(`¿Eliminar "${service.name}"? Las citas existentes no se modifican.`)) return
    try {
      await getDataProvider().admin.deleteService(tenant.id, service.id)
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'No se pudo eliminar el servicio.'))
    }
  }

  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Servicios" description="Lo que tus clientes pueden reservar, con su duración y precio." action={<div className="flex gap-2"><Button variant="outline" onClick={() => setImporting(true)}><Upload className="size-4" />Importar</Button><Button onClick={() => setEditing('new')}><Plus className="size-4" />Nuevo servicio</Button></div>} />
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}
      <Card className="overflow-hidden">
        {services.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-400">Aún no hay servicios. Crea el primero para empezar a recibir reservas.</p> : (
          <ul className="divide-y divide-slate-100">
            {services.map((service) => (
              <li key={service.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-48 flex-1">
                  <p className="font-semibold text-slate-800">{service.name} {!service.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Oculto</span>}</p>
                  <p className="text-sm text-slate-400">{service.description}</p>
                </div>
                <span className="w-24 text-sm text-slate-500">{formatDuration(service.durationMinutes)}</span>
                <span className="w-24 text-sm font-medium text-slate-700">{formatPrice(service.price, tenant.settings.locale, tenant.settings.currency)}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" className="px-2.5" aria-label={`Editar ${service.name}`} onClick={() => setEditing(service)}><Pencil className="size-4" /></Button>
                  <Button variant="danger" className="px-2.5" aria-label={`Eliminar ${service.name}`} onClick={() => remove(service)}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {importing && (
        <CsvImportModal<ServiceInput>
          title="Importar servicios"
          columns={['nombre', 'precio', 'duración (min)', 'descripción']}
          example={'nombre,precio,duración (min),descripción\nCorte & styling,120,60,Corte personalizado con acabado'}
          toRecord={([name, price, duration, description], index) => {
            if (!name) throw new Error('falta el nombre')
            return { name, price: toNumber(price, 'precio'), durationMinutes: toNumber(duration, 'duración'), description: description ?? '', active: true, order: services.length + index + 1 }
          }}
          onImport={async (records) => {
            const { admin } = getDataProvider()
            await Promise.all(records.map((record) => admin.saveService(tenant.id, record)))
          }}
          onClose={() => setImporting(false)}
        />
      )}
      {editing && <ServiceForm tenantId={tenant.id} service={editing === 'new' ? null : editing} nextOrder={services.length + 1} currency={tenant.settings.currency} onClose={() => setEditing(null)} />}
    </>
  )
}

function ServiceForm({ tenantId, service, nextOrder, currency, onClose }: { tenantId: string; service: Service | null; nextOrder: number; currency: string; onClose: () => void }) {
  const [form, setForm] = useState<ServiceInput>(service ?? { name: '', description: '', durationMinutes: 60, price: 0, active: true, order: nextOrder })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const { name, description, durationMinutes, price, active, order } = form
      await getDataProvider().admin.saveService(tenantId, { name: name.trim(), description: description.trim(), durationMinutes, price, active, order }, service?.id)
      onClose()
    } catch (saveError) {
      setError(errorMessage(saveError, 'No se pudo guardar el servicio.'))
      setBusy(false)
    }
  }

  return (
    <Modal title={service ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Nombre"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
        <Field label="Descripción"><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Duración (min)"><input required type="number" min={5} step={5} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} className={inputClass} /></Field>
          <Field label={`Precio (${currency})`}><input required type="number" min={0} step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} className={inputClass} /></Field>
          <Field label="Orden"><input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} className={inputClass} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="size-4 accent-(--brand)" />Visible en la página de reservas</label>
        {error && <Notice>{error}</Notice>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</Button></div>
      </form>
    </Modal>
  )
}
