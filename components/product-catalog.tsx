'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MessageCircle, Package } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { whatsappLink } from '@/lib/domain/contact'
import { formatPrice, initialsOf } from '@/lib/domain/time'
import type { Product, Tenant } from '@/lib/domain/types'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; tenant: Tenant; products: Product[] }

export function ProductCatalog({ tenantId }: { tenantId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [category, setCategory] = useState('all')

  useEffect(() => {
    const { booking } = getDataProvider()
    Promise.all([booking.getTenant(tenantId), booking.listProducts(tenantId)])
      .then(([tenant, products]) => setState(tenant ? { status: 'ready', tenant, products } : { status: 'error' }))
      .catch((error) => {
        console.error('[productos] No se pudo cargar el catálogo', error)
        setState({ status: 'error' })
      })
  }, [tenantId])

  if (state.status !== 'ready') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8f5] text-sm text-[#85847d]">
        {state.status === 'loading' ? <Loader2 className="h-6 w-6 animate-spin" /> : 'No pudimos cargar los productos.'}
      </main>
    )
  }

  const { profile, settings } = state.tenant
  const categories = [...new Set(state.products.map((item) => item.category).filter(Boolean))]
  const visible = category === 'all' ? state.products : state.products.filter((item) => item.category === category)

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#2b2420]" style={{ '--brand': profile.accent, '--brand-soft': profile.accentSoft } as React.CSSProperties}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12">
        <header className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-[#7c7b75] hover:text-[#2b2420]"><ArrowLeft className="h-4 w-4" />Reservar cita</Link>
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full font-serif text-xs" style={{ backgroundColor: profile.surface }}>{profile.logo || initialsOf(profile.name)}</div><span className="font-serif text-lg uppercase">{profile.name}</span></div>
        </header>
        <p className="mb-3 text-xs tracking-[0.28em] text-[#8c8b84] uppercase">Cuidado en casa</p>
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Productos</h1>
        <p className="mt-3 max-w-lg text-[#85847d]">Los mismos productos profesionales que usamos en el salón. Consúltanos disponibilidad y te lo separamos.</p>

        {categories.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {['all', ...categories].map((key) => (
              <button key={key} onClick={() => setCategory(key)} className={`rounded-full border px-4 py-2 text-sm ${category === key ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[#e4e2dc] bg-white'}`}>{key === 'all' ? 'Todos' : key}</button>
            ))}
          </div>
        )}

        {visible.length === 0 ? <p className="mt-12 text-[#85847d]">Pronto tendremos productos disponibles.</p> : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => {
              const link = whatsappLink(profile.whatsapp, `Hola ✨ quisiera consultar por ${product.name}.`)
              return (
                <article key={product.id} className="flex flex-col rounded-2xl border border-[#e4e2dc] bg-white p-5">
                  <div className="mb-5 flex h-36 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><Package className="h-10 w-10" /></div>
                  {product.brand && <p className="text-xs tracking-[0.15em] text-[#8c8b84] uppercase">{product.brand}</p>}
                  <h2 className="mt-1 font-medium">{product.name}</h2>
                  {product.description && <p className="mt-2 flex-1 text-sm text-[#85847d]">{product.description}</p>}
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-medium">{formatPrice(product.price, settings.locale, settings.currency)}</span>
                    {product.stock <= 0 ? <span className="text-xs text-[#8c8b84]">Agotado</span> : link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#2b2420] px-4 py-2 text-xs text-white"><MessageCircle className="h-3.5 w-3.5" />Consultar</a>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
