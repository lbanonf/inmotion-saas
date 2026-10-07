'use client'

import { useMemo, useState } from 'react'
import { MessageCircle, Search } from 'lucide-react'
import { phoneDigits, whatsappLink } from '@/lib/domain/contact'
import { formatDate, formatPrice, initialsOf } from '@/lib/domain/time'
import type { Appointment } from '@/lib/domain/types'
import type { AdminData } from './admin-shell'
import { Card, inputClass, PageHeader } from './ui'

type Client = {
  key: string
  name: string
  email: string
  phone: string
  visits: number
  upcoming: number
  spent: number
  lastDate: string
  lastService: string
}

/** Agrupa citas por cliente (teléfono, si no correo, si no nombre). */
export function buildClients(appointments: Appointment[], today: string): Client[] {
  const clients = new Map<string, Client>()
  for (const item of appointments) {
    const key = phoneDigits(item.contact.phone) || item.contact.email.toLowerCase() || item.contact.name.toLowerCase()
    if (!key) continue
    const client = clients.get(key) ?? { key, name: item.contact.name, email: item.contact.email, phone: item.contact.phone, visits: 0, upcoming: 0, spent: 0, lastDate: '', lastService: '' }
    if (item.status === 'approved' && item.date < today) {
      client.visits += 1
      client.spent += item.price
    }
    if ((item.status === 'approved' || item.status === 'pending') && item.date >= today) client.upcoming += 1
    if (item.date > client.lastDate) {
      client.lastDate = item.date
      client.lastService = item.serviceName
      client.name = item.contact.name || client.name
      client.email = item.contact.email || client.email
      client.phone = item.contact.phone || client.phone
    }
    clients.set(key, client)
  }
  return [...clients.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

export function ClientsSection({ data, today }: { data: AdminData; today: string }) {
  const { profile, settings } = data.tenant
  const [search, setSearch] = useState('')
  const clients = useMemo(() => buildClients(data.appointments, today), [data.appointments, today])
  const term = search.trim().toLowerCase()
  const visible = term ? clients.filter((client) => [client.name, client.email, client.phone].some((value) => value.toLowerCase().includes(term))) : clients

  return (
    <>
      <PageHeader eyebrow="Clientes" title="Tus clientes" description="Historial armado automáticamente a partir de las reservas." />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">{clients.length} clientes</p>
          <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><input aria-label="Buscar cliente" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, teléfono..." className={`${inputClass} pl-9 sm:w-64`} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr><th className="px-6 py-3.5">Cliente</th><th className="px-4 py-3.5">Última cita</th><th className="px-4 py-3.5">Visitas</th><th className="px-4 py-3.5">Próximas</th><th className="px-4 py-3.5">Total gastado</th><th className="px-4 py-3.5 text-right">Contacto</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">Aún no hay clientes. Aparecerán con las primeras reservas.</td></tr> : visible.map((client) => {
                const link = whatsappLink(client.phone, `Hola ${client.name.split(' ')[0]} 🤍 te escribimos de ${profile.name}.`)
                return (
                  <tr key={client.key} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-(--brand-soft) text-xs font-semibold text-(--brand)">{initialsOf(client.name || '?')}</div><div className="text-sm"><p className="font-semibold text-slate-700">{client.name || 'Sin nombre'}</p><p className="text-slate-400">{[client.phone, client.email].filter(Boolean).join(' · ')}</p></div></div></td>
                    <td className="px-4 py-4 text-sm text-slate-500"><p>{formatDate(client.lastDate, settings.locale)}</p><p className="text-slate-400">{client.lastService}</p></td>
                    <td className="px-4 py-4 text-sm text-slate-700">{client.visits}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{client.upcoming}</td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">{formatPrice(client.spent, settings.locale, settings.currency)}</td>
                    <td className="px-4 py-4 text-right">{link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><MessageCircle className="size-4" />WhatsApp</a>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
