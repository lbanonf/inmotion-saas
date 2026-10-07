'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogOut, Scissors } from 'lucide-react'
import { TEMPLATES } from '@/config/templates'
import { getDataProvider } from '@/lib/data'
import { applyTemplate } from '@/lib/seed'
import type { AdminUser, Tenant } from '@/lib/domain/types'
import { AdminShell } from './admin-shell'
import { Button, Field, inputClass, Notice } from './ui'

type TenantState = { status: 'loading' } | { status: 'ready'; tenant: Tenant | null } | { status: 'error'; message: string }

export function AdminApp({ tenantId }: { tenantId: string }) {
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined)
  const [tenantState, setTenantState] = useState<TenantState>({ status: 'loading' })

  useEffect(() => getDataProvider().auth.onAuthChange(setUser), [])

  useEffect(() => {
    if (!user) return
    return getDataProvider().admin.subscribeToTenant(
      tenantId,
      (tenant) => setTenantState({ status: 'ready', tenant }),
      (error) => {
        console.error('[admin] No se pudo leer el negocio', error)
        setTenantState({ status: 'error', message: 'No se pudo cargar la configuración del negocio.' })
      },
    )
  }, [tenantId, user])

  if (user === undefined) return <FullScreen><Loader2 className="size-6 animate-spin text-slate-400" /></FullScreen>
  if (user === null) return <LoginForm />
  if (tenantState.status === 'loading') return <FullScreen><Loader2 className="size-6 animate-spin text-slate-400" /></FullScreen>
  if (tenantState.status === 'error') return <FullScreen><AccessCard user={user} title="Error" message={tenantState.message} /></FullScreen>
  if (!tenantState.tenant) return <FullScreen><Onboarding tenantId={tenantId} user={user} /></FullScreen>
  if (!isTenantAdmin(tenantState.tenant, user)) {
    return <FullScreen><AccessCard user={user} title="Sin acceso" message={`Tu cuenta no administra este negocio. Pide que agreguen tu correo en adminEmails (o tu UID ${user.uid} en adminUids).`} /></FullScreen>
  }
  return <AdminShell tenant={tenantState.tenant} user={user} />
}

export function isTenantAdmin(tenant: Tenant, user: AdminUser) {
  return tenant.adminUids.includes(user.uid) || Boolean(user.email && tenant.adminEmails.map((email) => email.toLowerCase()).includes(user.email.toLowerCase()))
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#f8f8fa] px-5 py-10 text-slate-900">{children}</div>
}

function Brand() {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-(--brand) text-white shadow-lg"><Scissors className="size-5" /></div>
      <div><p className="text-sm font-bold tracking-tight">Panel de reservas</p><p className="text-[11px] text-slate-400">ADMINISTRACIÓN</p></div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      await getDataProvider().auth.signIn(email, password)
    } catch (error) {
      console.error('[admin] Error de inicio de sesión', error)
      const code = (error as { code?: string }).code
      setMessage({ tone: 'error', text: code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found' ? 'El acceso con correo y contraseña no está habilitado en Firebase Authentication.' : 'Correo o contraseña incorrectos.' })
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    if (!email) return setMessage({ tone: 'error', text: 'Escribe tu correo para enviarte el enlace.' })
    try {
      await getDataProvider().auth.sendPasswordReset(email)
      setMessage({ tone: 'success', text: 'Si el correo existe, te enviamos un enlace para restablecer la contraseña.' })
    } catch {
      setMessage({ tone: 'error', text: 'No pudimos enviar el correo. Inténtalo de nuevo.' })
    }
  }

  return (
    <FullScreen>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Brand />
        <h1 className="text-xl font-bold">Inicia sesión</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">Accede para gestionar citas, servicios y horarios.</p>
        <div className="grid gap-4">
          <Field label="Correo"><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field>
          <Field label="Contraseña"><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></Field>
          {message && <Notice tone={message.tone}>{message.text}</Notice>}
          <Button type="submit" disabled={busy}>{busy ? 'Ingresando...' : 'Ingresar'}</Button>
          <button type="button" onClick={resetPassword} className="text-xs text-slate-500 hover:text-(--brand)">¿Olvidaste tu contraseña?</button>
        </div>
      </form>
    </FullScreen>
  )
}

function AccessCard({ user, title, message }: { user: AdminUser; title: string; message: string }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <Brand />
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm break-words text-slate-500">{message}</p>
      <p className="mt-4 text-xs text-slate-400">Sesión: {user.email}</p>
      <Button variant="outline" className="mt-6" onClick={() => getDataProvider().auth.signOut()}><LogOut className="size-4" />Cerrar sesión</Button>
    </div>
  )
}

function Onboarding({ tenantId, user }: { tenantId: string; user: AdminUser }) {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0]
  const [name, setName] = useState(template.profile.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await applyTemplate(getDataProvider().admin, getDataProvider().booking, tenantId, { ...template, profile: { ...template.profile, name } }, { createTenant: { adminUids: [user.uid], adminEmails: user.email ? [user.email.toLowerCase()] : [] } })
    } catch (createError) {
      console.error('[admin] No se pudo crear el negocio', createError)
      setError('No se pudo crear el negocio. Revisa las reglas de Firestore y vuelve a intentarlo.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={create} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <Brand />
      <h1 className="text-xl font-bold">Configura tu negocio</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">Aún no existe el negocio <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{tenantId}</code>. Créalo y quedarás como administrador.</p>
      <div className="grid gap-4">
        <Field label="Plantilla inicial" hint="Solo es un punto de partida; todo se puede editar después.">
          <select value={templateId} onChange={(event) => { const next = TEMPLATES.find((item) => item.id === event.target.value) ?? TEMPLATES[0]; setTemplateId(next.id); setName(next.profile.name) }} className={inputClass}>
            {TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </Field>
        <Field label="Nombre del negocio"><input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>
        {error && <Notice>{error}</Notice>}
        <Button type="submit" disabled={busy}>{busy ? 'Creando...' : 'Crear negocio'}</Button>
      </div>
    </form>
  )
}
