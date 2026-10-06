'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, Scissors, Sparkles, UserRound } from 'lucide-react'
import { createAppointment } from '@/lib/appointments'

export type BookingConfig = {
  salon_id: string
  business: { name: string; eyebrow: string; description: string; logo?: string; location: string; accent: string; accentSoft: string }
  services: { id: string; name: string; description: string; duration: string; price: string }[]
  professionals: { id: string; name: string; role: string; initials: string }[]
  availability: { date: string; label: string; slots: string[] }[]
}

const steps = ['Servicio', 'Profesional', 'Fecha y hora', 'Tus datos']

export function BookingLanding({ config }: { config: BookingConfig }) {
  const [step, setStep] = useState(0)
  const [selectedService, setSelectedService] = useState(config.services[0]?.id ?? '')
  const [selectedProfessional, setSelectedProfessional] = useState(config.professionals[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState(config.availability[0]?.date ?? '')
  const [selectedTime, setSelectedTime] = useState(config.availability[0]?.slots[0] ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })

  const service = useMemo(() => config.services.find((item) => item.id === selectedService), [config.services, selectedService])
  const professional = useMemo(() => config.professionals.find((item) => item.id === selectedProfessional), [config.professionals, selectedProfessional])
  const day = useMemo(() => config.availability.find((item) => item.date === selectedDate), [config.availability, selectedDate])

  function goNext() {
    if (step < steps.length - 1) setStep((current) => current + 1)
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!service || !professional || !selectedDate || !selectedTime) {
      alert('Completa servicio, especialista, fecha y hora antes de reservar.')
      return
    }

    setIsSubmitting(true)

    try {
      await createAppointment({
        salon_id: config.salon_id,
        service: service.name,
        professional: professional.name,
        date: selectedDate,
        time: selectedTime,
        contact,
      })
      alert('Tu reserva se guardó correctamente. Está pendiente de confirmación.')
      setSubmitted(true)
    } catch (error) {
      console.error('[booking] No se pudo guardar la cita', error)
      alert('No pudimos guardar tu reserva. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#20201e]" style={{ '--brand': config.business.accent, '--brand-soft': config.business.accentSoft } as React.CSSProperties}>
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="relative hidden overflow-hidden bg-[#242622] px-10 py-12 text-[#f7f5ef] lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[var(--brand)] opacity-20 blur-3xl" />
          <div className="relative">
            <div className="mb-20 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-sm tracking-widest">{config.business.logo || config.business.name.slice(0, 2).toUpperCase()}</div>
              <span className="text-sm font-medium tracking-[0.18em] uppercase">{config.business.name}</span>
            </div>
            <p className="mb-5 text-xs tracking-[0.28em] text-white/50 uppercase">{config.business.eyebrow}</p>
            <h1 className="max-w-md font-serif text-5xl leading-[1.06] tracking-tight xl:text-6xl">Tu próximo look empieza aquí.</h1>
            <p className="mt-7 max-w-sm text-base leading-7 text-white/65">{config.business.description}</p>
          </div>
          <div className="relative space-y-4 text-sm text-white/55">
            <div className="flex items-center gap-3"><MapPin className="h-4 w-4" />{config.business.location}</div>
            <div className="flex items-center gap-3"><Sparkles className="h-4 w-4" />Una experiencia pensada para ti</div>
          </div>
        </aside>

        <section className="flex flex-col px-5 py-6 sm:px-10 sm:py-10 lg:px-16 lg:py-12">
          <header className="mb-10 flex items-center justify-between lg:mb-16">
            <div className="flex items-center gap-3 lg:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#242622] text-xs text-white">{config.business.logo || config.business.name.slice(0, 2).toUpperCase()}</div><span className="text-sm font-medium tracking-[0.15em] uppercase">{config.business.name}</span></div>
            <p className="ml-auto text-xs tracking-[0.2em] text-[#7c7b75] uppercase">Reservas online</p>
          </header>

          <div className="mb-12">
            <div className="mb-4 flex items-center justify-between text-xs text-[#8c8b84]"><span>Paso {step + 1} de {steps.length}</span><span>{steps[step]}</span></div>
            <div className="flex gap-1.5">{steps.map((item, index) => <div key={item} className="h-1 flex-1 rounded-full transition-colors" style={{ backgroundColor: index <= step ? config.business.accent : '#deddd8' }} />)}</div>
          </div>

          {submitted ? <SuccessState config={config} onReset={() => { setSubmitted(false); setStep(0) }} /> : <form onSubmit={submitBooking}>
            <div className="mb-10 min-h-[360px]">
              {step === 0 && <StepTitle icon={<Scissors />} title="¿Qué te gustaría hacer?" subtitle="Elige el servicio que mejor se adapta a ti." />}
              {step === 0 && <div className="mt-8 grid gap-3">{config.services.map((item) => <button type="button" key={item.id} onClick={() => setSelectedService(item.id)} className={`group flex items-center justify-between rounded-2xl border p-5 text-left transition-all ${selectedService === item.id ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[#e4e2dc] bg-white hover:border-[#bbb9b1]'}`}><div><p className="font-medium">{item.name}</p><p className="mt-1 text-sm text-[#898780]">{item.description} · {item.duration}</p></div><span className="text-sm text-[#6f6e68]">{item.price}</span></button>)}</div>}
              {step === 1 && <StepTitle icon={<UserRound />} title="¿Quién te atenderá?" subtitle="Selecciona a tu profesional de confianza." />}
              {step === 1 && <div className="mt-8 grid gap-3 sm:grid-cols-2">{config.professionals.map((item) => <button type="button" key={item.id} onClick={() => setSelectedProfessional(item.id)} className={`rounded-2xl border p-5 text-left transition-all ${selectedProfessional === item.id ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[#e4e2dc] bg-white hover:border-[#bbb9b1]'}`}><span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#242622] text-sm text-white">{item.initials}</span><p className="font-medium">{item.name}</p><p className="mt-1 text-sm text-[#898780]">{item.role}</p></button>)}</div>}
              {step === 2 && <StepTitle icon={<CalendarDays />} title="Encuentra tu momento" subtitle="Elige una fecha y horario disponible." />}
              {step === 2 && <div className="mt-8"><div className="flex gap-2 overflow-x-auto pb-2">{config.availability.map((item) => <button type="button" key={item.date} onClick={() => { setSelectedDate(item.date); setSelectedTime(item.slots[0]) }} className={`min-w-[92px] rounded-xl border px-3 py-3 text-center ${selectedDate === item.date ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[#e4e2dc] bg-white'}`}><span className="block text-xs text-[#898780]">{item.label}</span><span className="mt-1 block font-medium">{new Date(`${item.date}T12:00:00`).getDate()}</span></button>)}</div><div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">{day?.slots.map((slot) => <button type="button" key={slot} onClick={() => setSelectedTime(slot)} className={`rounded-xl border py-3 text-sm ${selectedTime === slot ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[#e4e2dc] bg-white'}`}><Clock3 className="mr-1 inline h-3.5 w-3.5" />{slot}</button>)}</div></div>}
              {step === 3 && <StepTitle icon={<Check />} title="Último paso" subtitle="Déjanos tus datos para confirmar la reserva." />}
              {step === 3 && <div className="mt-8 grid gap-4"><label className="grid gap-2 text-sm">Nombre completo<input required value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} className="rounded-xl border border-[#e4e2dc] bg-white px-4 py-3.5 outline-none focus:border-[var(--brand)]" placeholder="Tu nombre" /></label><label className="grid gap-2 text-sm">Correo electrónico<input required type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className="rounded-xl border border-[#e4e2dc] bg-white px-4 py-3.5 outline-none focus:border-[var(--brand)]" placeholder="hola@ejemplo.com" /></label><label className="grid gap-2 text-sm">Teléfono<input required value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className="rounded-xl border border-[#e4e2dc] bg-white px-4 py-3.5 outline-none focus:border-[var(--brand)]" placeholder="+51 999 999 999" /></label></div>}
            </div>
            <div className="flex items-center justify-between border-t border-[#e4e2dc] pt-6"><button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="flex items-center gap-2 text-sm text-[#797871] disabled:invisible"><ArrowLeft className="h-4 w-4" />Atrás</button>{step < 3 ? <button type="button" onClick={goNext} className="flex items-center gap-3 rounded-full bg-[#242622] px-6 py-3.5 text-sm text-white transition-transform hover:scale-[1.02]">Continuar<ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={isSubmitting} className="flex items-center gap-3 rounded-full bg-[var(--brand)] px-7 py-3.5 text-sm text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? 'Guardando...' : 'Confirmar reserva'}<Check className="h-4 w-4" /></button>}</div>
          </form>}
        </section>
      </div>
    </main>
  )
}

function StepTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) { return <div><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">{icon}</div><h2 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h2><p className="mt-3 text-[#85847d]">{subtitle}</p></div> }
function SuccessState({ config, onReset }: { config: BookingConfig; onReset: () => void }) { return <div className="flex min-h-[500px] flex-col items-center justify-center text-center"><div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]"><Check className="h-7 w-7" /></div><p className="mb-3 text-xs tracking-[0.25em] text-[#8c8b84] uppercase">Reserva recibida</p><h2 className="font-serif text-4xl">¡Gracias por elegirnos!</h2><p className="mt-4 max-w-sm leading-7 text-[#85847d]">Hemos registrado tu solicitud en {config.business.name}. Te contactaremos para confirmar los detalles.</p><button onClick={onReset} className="mt-8 rounded-full border border-[#d5d3cc] px-6 py-3 text-sm">Hacer otra reserva</button></div> }
