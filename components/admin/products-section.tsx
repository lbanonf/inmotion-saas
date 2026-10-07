'use client'

import { useState } from 'react'
import { Package, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { formatPrice } from '@/lib/domain/time'
import type { Product, ProductInput } from '@/lib/domain/types'
import type { AdminData } from './admin-shell'
import { CsvImportModal, toNumber } from './csv-import'
import { Button, Card, errorMessage, Field, inputClass, Modal, Notice, PageHeader } from './ui'

const LOW_STOCK = 3

export function ProductsSection({ data }: { data: AdminData }) {
  const { tenant, products } = data
  const { locale, currency } = tenant.settings
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('all')

  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))].sort()
  const visible = category === 'all' ? products : products.filter((item) => item.category === category)
  const inventoryValue = products.reduce((total, item) => total + item.price * item.stock, 0)
  const lowStock = products.filter((item) => item.active && item.stock <= LOW_STOCK).length

  async function remove(product: Product) {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return
    try {
      await getDataProvider().admin.deleteProduct(tenant.id, product.id)
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'No se pudo eliminar el producto.'))
    }
  }

  async function importProducts(records: ProductInput[]) {
    const { admin } = getDataProvider()
    await Promise.all(records.map((record) => admin.saveProduct(tenant.id, record)))
  }

  return (
    <>
      <PageHeader
        eyebrow="Tienda"
        title="Productos"
        description="Productos a la venta en el salón, con precio y stock."
        action={<div className="flex gap-2"><Button variant="outline" onClick={() => setImporting(true)}><Upload className="size-4" />Importar</Button><Button onClick={() => setEditing('new')}><Plus className="size-4" />Nuevo producto</Button></div>}
      />
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs font-medium text-slate-400">Productos</p><p className="mt-2 text-2xl font-bold">{products.length}</p></Card>
        <Card className="p-5"><p className="text-xs font-medium text-slate-400">Valor del inventario</p><p className="mt-2 text-2xl font-bold">{formatPrice(inventoryValue, locale, currency)}</p></Card>
        <Card className="p-5"><p className="text-xs font-medium text-slate-400">Stock bajo (≤ {LOW_STOCK})</p><p className={`mt-2 text-2xl font-bold ${lowStock > 0 ? 'text-amber-600' : ''}`}>{lowStock}</p></Card>
      </div>

      <Card className="overflow-hidden">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-4">
            {['all', ...categories].map((key) => (
              <button key={key} onClick={() => setCategory(key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${category === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{key === 'all' ? 'Todos' : key}</button>
            ))}
          </div>
        )}
        {visible.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-400">Aún no hay productos.</p> : (
          <ul className="divide-y divide-slate-100">
            {visible.map((product) => (
              <li key={product.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Package className="size-5" /></div>
                <div className="min-w-48 flex-1">
                  <p className="font-semibold text-slate-800">{product.name} {!product.active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Oculto</span>}</p>
                  <p className="text-sm text-slate-400">{[product.brand, product.category].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`w-24 text-sm ${product.stock <= LOW_STOCK ? 'font-semibold text-amber-600' : 'text-slate-500'}`}>{product.stock} en stock</span>
                <span className="w-24 text-sm font-medium text-slate-700">{formatPrice(product.price, locale, currency)}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" className="px-2.5" aria-label={`Editar ${product.name}`} onClick={() => setEditing(product)}><Pencil className="size-4" /></Button>
                  <Button variant="danger" className="px-2.5" aria-label={`Eliminar ${product.name}`} onClick={() => remove(product)}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && <ProductForm tenantId={tenant.id} product={editing === 'new' ? null : editing} nextOrder={products.length + 1} currency={currency} categories={categories} onClose={() => setEditing(null)} />}
      {importing && (
        <CsvImportModal<ProductInput>
          title="Importar productos"
          columns={['nombre', 'precio', 'stock', 'marca', 'categoría', 'descripción']}
          example={'nombre,precio,stock,marca,categoría,descripción\nShampoo reparador 250 ml,129,10,Wella Professionals,Reparación,Limpieza suave'}
          toRecord={([name, price, stock, brand, category, description], index) => {
            if (!name) throw new Error('falta el nombre')
            return { name, price: toNumber(price, 'precio'), stock: stock ? toNumber(stock, 'stock') : 0, brand: brand ?? '', category: category ?? '', description: description ?? '', active: true, order: products.length + index + 1 }
          }}
          onImport={importProducts}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  )
}

function ProductForm({ tenantId, product, nextOrder, currency, categories, onClose }: { tenantId: string; product: Product | null; nextOrder: number; currency: string; categories: string[]; onClose: () => void }) {
  const [form, setForm] = useState<ProductInput>(product ?? { name: '', brand: '', category: '', description: '', price: 0, stock: 0, active: true, order: nextOrder })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const { name, brand, category, description, price, stock, active, order } = form
      await getDataProvider().admin.saveProduct(tenantId, { name: name.trim(), brand: brand.trim(), category: category.trim(), description: description.trim(), price, stock, active, order }, product?.id)
      onClose()
    } catch (saveError) {
      setError(errorMessage(saveError, 'No se pudo guardar el producto.'))
      setBusy(false)
    }
  }

  return (
    <Modal title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Nombre"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marca"><input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} className={inputClass} /></Field>
          <Field label="Categoría">
            <input list="product-categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass} />
            <datalist id="product-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist>
          </Field>
        </div>
        <Field label="Descripción"><textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`Precio (${currency})`}><input required type="number" min={0} step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} className={inputClass} /></Field>
          <Field label="Stock"><input required type="number" min={0} value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} className={inputClass} /></Field>
          <Field label="Orden"><input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} className={inputClass} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="size-4 accent-(--brand)" />Visible en la tienda</label>
        {error && <Notice>{error}</Notice>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</Button></div>
      </form>
    </Modal>
  )
}
