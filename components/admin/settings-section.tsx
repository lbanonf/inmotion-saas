'use client'

import { useState } from 'react'
import { Database } from 'lucide-react'
import { TEMPLATES } from '@/config/templates'
import { getDataProvider } from '@/lib/data'
import { applyTemplate } from '@/lib/seed'
import type { BusinessProfile, Tenant } from '@/lib/domain/types'
import { HoursEditor, validateHours } from './hours-editor'
import { Button, Card, errorMessage, Field, inputClass, Notice, PageHeader } from './ui'

const profileFields: { key: keyof BusinessProfile; label: string; hint?: string; placeholder?: string }[] = [
  { key: 'name', label: 'Nombre del negocio' },
  { key: 'logo', label: 'Logotipo (iniciales)', hint: 'Vacío = iniciales del nombre.' },
  { key: 'eyebrow', label: 'Texto superior', placeholder: 'Color · Tratamientos · Styling' },
  { key: 'headline', label: 'Título principal' },
  { key: 'location', label: 'Zona / ciudad', placeholder: 'San Isidro, Lima' },
  { key: 'address', label: 'Dirección exacta' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'Con código de país, ej. 51970639275.' },
  { key: 'phone', label: 'Teléfono visible' },
  { key: 'instagram', label: 'Instagram', placeholder: 'usuario (sin @)' },
  { key: 'email', label: 'Correo de contacto' },
]

const colorFields: { key: 'accent' | 'accentSoft' | 'surface'; label: string }[] = [
  { key: 'accent', label: 'Color de marca' },
  { key: 'accentSoft', label: 'Color suave' },
  { key: 'surface', label: 'Fondo del panel lateral' },
]

export function SettingsSection({ tenant }: { tenant: Tenant }) {
  const [profile, setProfile] = useState(tenant.profile)
  const [settings, setSettings] = useState(tenant.settings)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  function validate() {
    const invalidHours = validateHours(settings.weeklyHours)
    if (invalidHours) return invalidHours
    try {
      new Intl.DateTimeFormat(settings.locale, { timeZone: settings.timezone })
      new Intl.NumberFormat(settings.locale, { style: 'currency', currency: settings.currency })
    } catch {
      return 'La zona horaria, el idioma o la moneda no son válidos.'
    }
    return null
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const invalid = validate()
    if (invalid) return setMessage({ tone: 'error', text: invalid })
    setBusy(true)
    setMessage(null)
    try {
      await getDataProvider().admin.updateTenant(tenant.id, { profile: { ...profile, whatsapp: profile.whatsapp.replace(/\D/g, ''), instagram: profile.instagram.replace(/^@/, '') }, settings })
      setMessage({ tone: 'success', text: 'Cambios guardados.' })
    } catch (saveError) {
      setMessage({ tone: 'error', text: errorMessage(saveError, 'No se pudieron guardar los cambios.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form onSubmit={save}>
        <PageHeader eyebrow="Configuración" title="Tu negocio" description="Marca, contacto, horarios y reglas de reserva." action={<Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar cambios'}</Button>} />
        {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-5 font-semibold">Marca y contacto</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {profileFields.map(({ key, label, hint, placeholder }) => (
                <Field key={key} label={label} hint={hint}><input value={profile[key]} required={key === 'name'} placeholder={placeholder} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} className={inputClass} /></Field>
              ))}
              <Field label="Descripción" className="sm:col-span-2"><textarea rows={3} value={profile.description} onChange={(event) => setProfile({ ...profile, description: event.target.value })} className={inputClass} /></Field>
              <div className="grid grid-cols-3 gap-4 sm:col-span-2">
                {colorFields.map(({ key, label }) => (
                  <Field key={key} label={label}><input type="color" value={profile[key]} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1" /></Field>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid content-start gap-6">
            <Card className="p-6">
              <h2 className="mb-5 font-semibold">Reglas de reserva</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Intervalo (min)" hint="Cada cuánto empieza un turno."><select value={settings.slotIntervalMinutes} onChange={(event) => setSettings({ ...settings, slotIntervalMinutes: Number(event.target.value) })} className={inputClass}>{[10, 15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                <Field label="Días a futuro" hint="Ventana de reserva."><input type="number" min={1} max={180} value={settings.bookingWindowDays} onChange={(event) => setSettings({ ...settings, bookingWindowDays: Number(event.target.value) })} className={inputClass} /></Field>
                <Field label="Antelación (min)" hint="Mínimo antes de la cita."><input type="number" min={0} step={15} value={settings.minNoticeMinutes} onChange={(event) => setSettings({ ...settings, minNoticeMinutes: Number(event.target.value) })} className={inputClass} /></Field>
                <Field label="Zona horaria"><input value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} className={inputClass} placeholder="America/Lima" /></Field>
                <Field label="Idioma"><input value={settings.locale} onChange={(event) => setSettings({ ...settings, locale: event.target.value })} className={inputClass} placeholder="es-PE" /></Field>
                <Field label="Moneda"><input value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value.toUpperCase() })} className={inputClass} placeholder="PEN" maxLength={3} /></Field>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-1 font-semibold">Horario de atención</h2>
              <p className="mb-3 text-xs text-slate-400">Horario por defecto. Cada profesional puede tener uno propio en Equipo.</p>
              <HoursEditor value={settings.weeklyHours} onChange={(weeklyHours) => setSettings({ ...settings, weeklyHours })} />
            </Card>
          </div>
        </div>
      </form>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-1 font-semibold">Administradores</h2>
          <p className="mb-4 text-xs text-slate-400">Por seguridad se gestionan desde la consola de Firebase (campo adminEmails del negocio).</p>
          <ul className="grid gap-1 text-sm text-slate-600">{tenant.adminEmails.map((email) => <li key={email}>{email}</li>)}</ul>
        </Card>
        <SampleDataCard tenantId={tenant.id} />
      </div>
    </>
  )
}

function SampleDataCard({ tenantId }: { tenantId: string }) {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [includeProfile, setIncludeProfile] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const loadable = TEMPLATES.filter((item) => item.services.length > 0)

  async function load() {
    const template = TEMPLATES.find((item) => item.id === templateId)
    if (!template || !confirm('Se agregan o actualizan (por nombre) servicios, equipo, productos y respuestas. No se borra nada. ¿Continuar?')) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await applyTemplate(getDataProvider().admin, getDataProvider().booking, tenantId, template, { includeProfile })
      setMessage({ tone: 'success', text: `Listo: ${result.services} servicios, ${result.professionals} profesionales, ${result.products} productos y ${result.faqs} respuestas.` })
    } catch (loadError) {
      setMessage({ tone: 'error', text: errorMessage(loadError, 'No se pudieron cargar los datos.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Database className="size-4 text-(--brand)" />Datos de ejemplo</h2>
      <p className="mb-4 text-xs text-slate-400">Carga o actualiza el catálogo de la plantilla. Los registros con el mismo nombre se actualizan; nada se duplica ni se borra.</p>
      <div className="grid gap-3">
        <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className={inputClass}>{loadable.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={includeProfile} onChange={(event) => setIncludeProfile(event.target.checked)} className="size-4 accent-(--brand)" />También reemplazar marca, horarios y asistente</label>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <div><Button variant="outline" onClick={load} disabled={busy}>{busy ? 'Cargando...' : 'Cargar / actualizar datos'}</Button></div>
      </div>
    </Card>
  )
}
