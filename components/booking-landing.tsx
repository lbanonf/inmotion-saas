'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, ArrowRight, AtSign, CalendarDays, Check, Clock3, Loader2, Mail, MapPin, MessageCircle, Phone, Scissors, ShoppingBag, UserRound } from 'lucide-react'
import { getDataProvider, SlotTakenError } from '@/lib/data'
import { computeAvailability, professionalCanDo } from '@/lib/domain/availability'
import { isLightColor, whatsappLink } from '@/lib/domain/contact'
import { addDays, capitalize, formatDate, formatDuration, formatPrice, initialsOf, nowInTimezone } from '@/lib/domain/time'
import type { Professional, Service, Tenant } from '@/lib/domain/types'

const steps = ['Servicio', 'Profesional', 'Fecha y hora', 'Tus datos']

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tenant: Tenant; services: Service[]; professionals: Professional[]; hasProducts: boolean }

export function BookingLanding({ tenantId }: { tenantId: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const { booking } = getDataProvider()

    Promise.all([booking.getTenant(tenantId), booking.listServices(tenantId), booking.listProfessionals(tenantId), booking.listProducts(tenantId).catch(() => [])])
      .then(([tenant, services, professionals, products]) => {
        if (cancelled) return
        if (!tenant) setState({ status: 'error', message: 'Este negocio aún no está configurado. Ingresa a /admin para crearlo.' })
        else setState({ status: 'ready', tenant, services, professionals, hasProducts: products.length > 0 })
      })
      .catch((error) => {
        console.error('[booking] No se pudo cargar el negocio', error)
        if (!cancelled) setState({ status: 'error', message: 'No pudimos cargar la información. Inténtalo de nuevo en unos minutos.' })
      })

    return () => {
      cancelled = true
    }
  }, [tenantId])

  if (state.status === 'loading') {
    return <CenteredMessage><Loader2 className="h-6 w-6 animate-spin text-[#8c8b84]" /></CenteredMessage>
  }
  if (state.status === 'error') {
    return <CenteredMessage><AlertCircle className="mb-3 h-6 w-6 text-[#8c8b84]" /><p className="max-w-sm text-[#6f6e68]">{state.message}</p></CenteredMessage>
  }
  return <BookingFlow tenantId={tenantId} tenant={state.tenant} services={state.services} professionals={state.professionals} hasProducts={state.hasProducts} />
}

function BookingFlow({ tenantId, tenant, services, professionals, hasProducts }: { tenantId: string; tenant: Tenant; services: Service[]; professionals: Professional[]; hasProducts: boolean }) {
  const { profile, settings } = tenant
  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [notes, setNotes] = useState('')
  const [takenKeys, setTakenKeys] = useState<Set<string>>(new Set())
  const [locksReady, setLocksReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const service = services.find((item) => item.id === serviceId)
  const eligibleProfessionals = useMemo(() => professionals.filter((item) => professionalCanDo(item, serviceId)), [professionals, serviceId])
  const professional = eligibleProfessionals.find((item) => item.id === professionalId)
  const logo = profile.logo || initialsOf(profile.name)
  const lightSurface = isLightColor(profile.surface)
  const muted = lightSurface ? 'text-[#2b2420]/60' : 'text-white/60'
  const whatsapp = whatsappLink(profile.whatsapp, 'Hola ✨ Me gustaría recibir una asesoría personalizada para mi cabello.')

  // Horarios ocupados en tiempo real dentro de la ventana de reserva.
  useEffect(() => {
    const today = nowInTimezone(settings.timezone).date
    return getDataProvider().booking.subscribeToSlotLocks(
      tenantId,
      today,
      addDays(today, settings.bookingWindowDays),
      (locks) => {
        setTakenKeys(new Set(locks.map((lock) => lock.id)))
        setLocksReady(true)
      },
      (lockError) => {
        console.error('[booking] No se pudo leer la disponibilidad', lockError)
        setError('No pudimos consultar la disponibilidad en tiempo real.')
        setLocksReady(true)
      },
    )
  }, [tenantId, settings.timezone, settings.bookingWindowDays])

  const availability = useMemo(() => {
    if (!service || !professional) return []
    return computeAvailability({ settings, service, professionalId: professional.id, professionalHours: professional.weeklyHours, takenKeys })
  }, [settings, service, professional, takenKeys])

  const day = availability.find((item) => item.date === selectedDate)
  const timeStillFree = Boolean(day?.slots.includes(selectedTime))

  const canContinue = [Boolean(service), Boolean(professional), timeStillFree, true][step]

  function selectService(id: string) {
    setServiceId(id)
    setSelectedDate('')
    setSelectedTime('')
    if (!professionals.some((item) => item.id === professionalId && professionalCanDo(item, id))) setProfessionalId('')
  }

  function goNext() {
    setError(null)
    if (step === 1 && !selectedDate && availability[0]) {
      setSelectedDate(availability[0].date)
      setSelectedTime(availability[0].slots[0])
    }
    if (canContinue && step < steps.length - 1) setStep((current) => current + 1)
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!service || !professional || !timeStillFree) {
      setError('El horario elegido ya no está disponible. Elige otro, por favor.')
      setStep(2)
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await getDataProvider().booking.createAppointment(tenantId, {
        service,
        professional,
        date: selectedDate,
        time: selectedTime,
        contact,
        notes,
        source: 'web',
        slotIntervalMinutes: settings.slotIntervalMinutes,
      })
      setSubmitted(true)
    } catch (submitError) {
      if (submitError instanceof SlotTakenError) {
        setError('Alguien acaba de reservar ese horario. Elige otro, por favor.')
        setSelectedTime('')
        setStep(2)
      } else {
        console.error('[booking] No se pudo guardar la cita', submitError)
        setError('No pudimos guardar tu reserva. Inténtalo de nuevo.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function reset() {
    setSubmitted(false)
    setStep(0)
    setServiceId('')
    setProfessionalId('')
    setSelectedDate('')
    setSelectedTime('')
    setNotes('')
  }

  const selectable = (active: boolean) => (active ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[#e4e2dc] bg-white hover:border-[#bbb9b1]')

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#2b2420]" style={{ '--brand': profile.accent, '--brand-soft': profile.accentSoft, '--surface': profile.surface } as React.CSSProperties}>
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.82fr_1.18fr]">
        <aside className={`relative hidden overflow-hidden bg-[var(--surface)] px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16 ${lightSurface ? 'text-[#2b2420]' : 'text-[#f7f5ef]'}`}>
          <div className={`absolute -left-28 top-24 h-72 w-72 rounded-full bg-[var(--brand)] blur-3xl ${lightSurface ? 'opacity-10' : 'opacity-20'}`} />
          <div className="relative">
            <div className="mb-20 flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full font-serif text-base tracking-wide ${lightSurface ? 'bg-[#faf8f5] shadow-sm' : 'border border-white/30'}`}>{logo}</div>
              <span className="font-serif text-2xl tracking-tight uppercase">{profile.name}</span>
            </div>
            {profile.eyebrow && <p className={`mb-5 text-xs tracking-[0.28em] uppercase ${muted}`}>{profile.eyebrow}</p>}
            <h1 className="max-w-md font-serif text-5xl leading-[1.06] tracking-tight xl:text-6xl">{profile.headline}</h1>
            {profile.description && <p className={`mt-7 max-w-sm text-base leading-7 ${muted}`}>{profile.description}</p>}
          </div>
          <div className={`relative space-y-4 text-sm ${muted}`}>
            {(profile.address || profile.location) && <div className="flex items-center gap-3"><MapPin className="h-4 w-4" />{profile.address || profile.location}</div>}
            {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline"><MessageCircle className="h-4 w-4" />{profile.phone || 'WhatsApp'}</a>}
            {!whatsapp && profile.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4" />{profile.phone}</div>}
            {profile.instagram && <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline"><AtSign className="h-4 w-4" />{profile.instagram}</a>}
            {profile.email && <div className="flex items-center gap-3"><Mail className="h-4 w-4" />{profile.email}</div>}
            {hasProducts && <Link href="/productos" className="flex items-center gap-3 hover:underline"><ShoppingBag className="h-4 w-4" />Productos a la venta</Link>}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col px-5 py-6 sm:px-10 sm:py-10 lg:px-16 lg:py-12">
          <header className="mb-10 flex items-center justify-between lg:mb-16">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] font-serif text-xs" style={{ color: lightSurface ? '#2b2420' : '#f7f5ef' }}>{logo}</div>
              <span className="font-serif text-lg tracking-tight uppercase">{profile.name}</span>
            </div>
            <div className="ml-auto flex items-center gap-4">
              {hasProducts && <Link href="/productos" aria-label="Productos" className="text-[#7c7b75] hover:text-[var(--brand)] lg:hidden"><ShoppingBag className="h-5 w-5" /></Link>}
              {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp" className="text-[#7c7b75] hover:text-[var(--brand)] lg:hidden"><MessageCircle className="h-5 w-5" /></a>}
              {profile.instagram && <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-[#7c7b75] hover:text-[var(--brand)] lg:hidden"><AtSign className="h-5 w-5" /></a>}
              <p className="text-xs tracking-[0.2em] text-[#7c7b75] uppercase">Reservas online</p>
            </div>
          </header>

          <div className="mb-12">
            <div className="mb-4 flex items-center justify-between text-xs text-[#8c8b84]"><span>Paso {step + 1} de {steps.length}</span><span>{steps[step]}</span></div>
            <div className="flex gap-1.5">{steps.map((item, index) => <div key={item} className="h-1 flex-1 rounded-full transition-colors" style={{ backgroundColor: index <= step || submitted ? profile.accent : '#deddd8' }} />)}</div>
          </div>

          {submitted ? (
            <SuccessState businessName={profile.name} whatsapp={whatsappLink(profile.whatsapp, `Hola ✨ acabo de reservar ${service?.name} con ${professional?.name} el ${formatDate(selectedDate, settings.locale, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${selectedTime}. Mi nombre es ${contact.name}.`)} summary={`${service?.name} con ${professional?.name} · ${formatDate(selectedDate, settings.locale, { weekday: 'long', day: 'numeric', month: 'long' })}, ${selectedTime}`} onReset={reset} />
          ) : (
            <form onSubmit={submitBooking}>
              <div className="mb-10 min-h-[360px]">
                {error && <p role="alert" className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}

                {step === 0 && <>
                  <StepTitle icon={<Scissors />} title="¿Qué te gustaría hacer?" subtitle="Elige el servicio que mejor se adapta a ti." />
                  {services.length === 0 ? <EmptyNote>Aún no hay servicios disponibles para reservar.</EmptyNote> : (
                    <div className="mt-8 grid gap-3">
                      {services.map((item) => (
                        <button type="button" key={item.id} onClick={() => selectService(item.id)} aria-pressed={serviceId === item.id} className={`group flex items-center justify-between gap-4 rounded-2xl border p-5 text-left transition-all ${selectable(serviceId === item.id)}`}>
                          <div><p className="font-medium">{item.name}</p><p className="mt-1 text-sm text-[#898780]">{[item.description, formatDuration(item.durationMinutes)].filter(Boolean).join(' · ')}</p></div>
                          <span className="shrink-0 text-sm text-[#6f6e68]">{formatPrice(item.price, settings.locale, settings.currency)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>}

                {step === 1 && <>
                  <StepTitle icon={<UserRound />} title="¿Quién te atenderá?" subtitle="Selecciona a tu profesional de confianza." />
                  {eligibleProfessionals.length === 0 ? <EmptyNote>No hay profesionales disponibles para este servicio.</EmptyNote> : (
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {eligibleProfessionals.map((item) => (
                        <button type="button" key={item.id} onClick={() => { setProfessionalId(item.id); setSelectedDate(''); setSelectedTime('') }} aria-pressed={professionalId === item.id} className={`rounded-2xl border p-5 text-left transition-all ${selectable(professionalId === item.id)}`}>
                          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#2b2420] text-sm text-white">{initialsOf(item.name)}</span>
                          <p className="font-medium">{item.name}</p>
                          <p className="mt-1 text-sm text-[#898780]">{item.role}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>}

                {step === 2 && <>
                  <StepTitle icon={<CalendarDays />} title="Encuentra tu momento" subtitle="Elige una fecha y horario disponible." />
                  {!locksReady ? <div className="mt-8"><Loader2 className="h-5 w-5 animate-spin text-[#8c8b84]" /></div> : availability.length === 0 ? <EmptyNote>No hay horarios disponibles en los próximos {settings.bookingWindowDays} días. Prueba con otro profesional.</EmptyNote> : (
                    <div className="mt-8">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {availability.map((item) => (
                          <button type="button" key={item.date} onClick={() => { setSelectedDate(item.date); setSelectedTime(item.slots[0]) }} aria-pressed={selectedDate === item.date} className={`min-w-[92px] rounded-xl border px-3 py-3 text-center ${selectable(selectedDate === item.date)}`}>
                            <span className="block text-xs text-[#898780] capitalize">{formatDate(item.date, settings.locale, { weekday: 'short' })}</span>
                            <span className="mt-1 block font-medium">{formatDate(item.date, settings.locale, { day: 'numeric', month: 'short' })}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {day?.slots.map((slot) => (
                          <button type="button" key={slot} onClick={() => setSelectedTime(slot)} aria-pressed={selectedTime === slot} className={`rounded-xl border py-3 text-sm ${selectedTime === slot ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[#e4e2dc] bg-white hover:border-[#bbb9b1]'}`}>
                            <Clock3 className="mr-1 inline h-3.5 w-3.5" />{slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>}

                {step === 3 && <>
                  <StepTitle icon={<Check />} title="Último paso" subtitle="Déjanos tus datos para confirmar la reserva." />
                  <div className="mt-6 rounded-2xl border border-[#e4e2dc] bg-white p-4 text-sm text-[#6f6e68]">
                    <p className="font-medium text-[#20201e]">{service?.name} · {service && formatPrice(service.price, settings.locale, settings.currency)}</p>
                    <p className="mt-1">{professional?.name} · {capitalize(formatDate(selectedDate, settings.locale, { weekday: 'long', day: 'numeric', month: 'long' }))}, {selectedTime}</p>
                  </div>
                  <div className="mt-6 grid gap-4">
                    <Field label="Nombre completo"><input required autoComplete="name" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} className={inputClass} placeholder="Tu nombre" /></Field>
                    <Field label="Correo electrónico"><input required type="email" autoComplete="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className={inputClass} placeholder="hola@ejemplo.com" /></Field>
                    <Field label="Teléfono"><input required type="tel" autoComplete="tel" pattern="[+0-9 ()-]{6,20}" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className={inputClass} placeholder="+51 999 999 999" /></Field>
                    <Field label="Comentarios (opcional)"><textarea rows={2} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} placeholder="¿Algo que debamos saber?" /></Field>
                  </div>
                </>}
              </div>

              <div className="flex items-center justify-between border-t border-[#e4e2dc] pt-6">
                <button type="button" onClick={() => { setError(null); setStep((current) => Math.max(0, current - 1)) }} disabled={step === 0} className="flex items-center gap-2 text-sm text-[#797871] disabled:invisible"><ArrowLeft className="h-4 w-4" />Atrás</button>
                {step < steps.length - 1 ? (
                  <button type="button" onClick={goNext} disabled={!canContinue} className="flex items-center gap-3 rounded-full bg-[#2b2420] px-6 py-3.5 text-sm text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100">Continuar<ArrowRight className="h-4 w-4" /></button>
                ) : (
                  <button type="submit" disabled={isSubmitting} className="flex items-center gap-3 rounded-full bg-[var(--brand)] px-7 py-3.5 text-sm text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? 'Guardando...' : 'Confirmar reserva'}<Check className="h-4 w-4" /></button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

const inputClass = 'rounded-xl border border-[#e4e2dc] bg-white px-4 py-3.5 outline-none focus:border-[var(--brand)]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm">{label}{children}</label>
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7f4] px-6 text-center text-sm">{children}</main>
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 rounded-2xl border border-dashed border-[#d5d3cc] p-6 text-center text-sm text-[#85847d]">{children}</p>
}

function StepTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return <div><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">{icon}</div><h2 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h2><p className="mt-3 text-[#85847d]">{subtitle}</p></div>
}

function SuccessState({ businessName, summary, whatsapp, onReset }: { businessName: string; summary: string; whatsapp: string | null; onReset: () => void }) {
  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]"><Check className="h-7 w-7" /></div>
      <p className="mb-3 text-xs tracking-[0.25em] text-[#8c8b84] uppercase">Reserva recibida</p>
      <h2 className="font-serif text-4xl">¡Gracias por elegirnos!</h2>
      <p className="mt-4 max-w-sm leading-7 text-[#85847d]">Registramos tu solicitud en {businessName}: <span className="text-[#20201e]">{summary}</span>. Está pendiente de confirmación; te contactaremos pronto.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-sm text-white"><MessageCircle className="h-4 w-4" />Avisar por WhatsApp</a>}
        <button onClick={onReset} className="rounded-full border border-[#d5d3cc] px-6 py-3 text-sm">Hacer otra reserva</button>
      </div>
    </div>
  )
}
