'use client'

import { useState } from 'react'
import { Bot, Copy, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { getDataProvider } from '@/lib/data'
import { buildAssistantPrompt, matchFaq } from '@/lib/domain/assistant'
import type { AssistantSettings, Faq, FaqInput } from '@/lib/domain/types'
import type { AdminData } from './admin-shell'
import { Button, Card, errorMessage, Field, inputClass, Modal, Notice, PageHeader } from './ui'

export function AssistantSection({ data }: { data: AdminData }) {
  const { tenant, faqs } = data
  const [editing, setEditing] = useState<Faq | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  async function remove(faq: Faq) {
    if (!confirm('¿Eliminar esta pregunta frecuente?')) return
    try {
      await getDataProvider().admin.deleteFaq(tenant.id, faq.id)
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'No se pudo eliminar.'))
    }
  }

  return (
    <>
      <PageHeader eyebrow="Asistente" title="Bot y respuestas frecuentes" description="Lo que el asistente sabe responder. Es la base para entrenar el bot de WhatsApp e Instagram." action={<Button variant="outline" onClick={() => setShowPrompt(true)}><Bot className="size-4" />Ver conocimiento del bot</Button>} />
      {error && <div className="mb-6"><Notice>{error}</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="grid content-start gap-6">
          <PersonaForm tenantId={tenant.id} assistant={tenant.assistant} />
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div><h2 className="font-semibold">Preguntas frecuentes</h2><p className="text-xs text-slate-400">{faqs.length} respuestas aprobadas</p></div>
              <Button onClick={() => setEditing('new')}><Plus className="size-4" />Nueva</Button>
            </div>
            {faqs.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-400">Agrega las preguntas que más te hacen tus clientes.</p> : (
              <ul className="divide-y divide-slate-100">
                {faqs.map((faq) => (
                  <li key={faq.id} className="flex gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">{faq.question} {!faq.active && <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Inactiva</span>}</p>
                      <p className="mt-1 text-sm whitespace-pre-line text-slate-500">{faq.answer}</p>
                      {faq.keywords.length > 0 && <p className="mt-2 flex flex-wrap gap-1">{faq.keywords.map((keyword) => <span key={keyword} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{keyword}</span>)}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" className="px-2.5" aria-label="Editar" onClick={() => setEditing(faq)}><Pencil className="size-4" /></Button>
                      <Button variant="danger" className="px-2.5" aria-label="Eliminar" onClick={() => remove(faq)}><Trash2 className="size-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <ChatPreview data={data} />
      </div>

      {editing && <FaqForm tenantId={tenant.id} faq={editing === 'new' ? null : editing} nextOrder={faqs.length + 1} onClose={() => setEditing(null)} />}
      {showPrompt && <PromptModal data={data} onClose={() => setShowPrompt(false)} />}
    </>
  )
}

function PersonaForm({ tenantId, assistant }: { tenantId: string; assistant: AssistantSettings }) {
  const [form, setForm] = useState(assistant)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      await getDataProvider().admin.updateTenant(tenantId, { assistant: form })
      setMessage({ tone: 'success', text: 'Personalidad guardada.' })
    } catch (saveError) {
      setMessage({ tone: 'error', text: errorMessage(saveError, 'No se pudo guardar.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={save} className="grid gap-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Personalidad</h2><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="size-4 accent-(--brand)" />Activo</label></div>
        <Field label="Nombre del asistente"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
        <Field label="Tono y estilo" hint="Cómo habla: tutea, emojis, frases que usa el dueño, qué evitar."><textarea rows={3} value={form.tone} onChange={(event) => setForm({ ...form, tone: event.target.value })} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Saludo"><textarea rows={2} value={form.greeting} onChange={(event) => setForm({ ...form, greeting: event.target.value })} className={inputClass} /></Field>
          <Field label="Mensaje al derivar a una persona"><textarea rows={2} value={form.handoffMessage} onChange={(event) => setForm({ ...form, handoffMessage: event.target.value })} className={inputClass} /></Field>
        </div>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</Button></div>
      </form>
    </Card>
  )
}

type ChatMessage = { from: 'client' | 'bot'; text: string; note?: string }

function ChatPreview({ data }: { data: AdminData }) {
  const { assistant } = data.tenant
  const [messages, setMessages] = useState<ChatMessage[]>([{ from: 'bot', text: assistant.greeting }])
  const [text, setText] = useState('')

  function send(event: React.FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    const match = matchFaq(text, data.faqs)
    setMessages((current) => [
      ...current,
      { from: 'client', text },
      match ? { from: 'bot', text: match.faq.answer, note: `Respuesta: "${match.faq.question}"` } : { from: 'bot', text: assistant.handoffMessage, note: 'Sin respuesta aprobada: se deriva a una persona' },
    ])
    setText('')
  }

  return (
    <Card className="flex h-[620px] flex-col overflow-hidden xl:sticky xl:top-6">
      <div className="border-b border-slate-100 px-5 py-4"><p className="font-semibold">Probar el asistente</p><p className="text-xs text-slate-400">Vista previa con tus respuestas frecuentes (sin IA todavía).</p></div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.from === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${message.from === 'client' ? 'rounded-br-md bg-[#d9fdd3] text-slate-800' : 'rounded-bl-md bg-white text-slate-800'}`}>
              <p className="whitespace-pre-line">{message.text}</p>
              {message.note && <p className="mt-1 text-[10px] text-slate-400">{message.note}</p>}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
        <input aria-label="Mensaje" value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribe como si fueras un cliente..." className={inputClass} />
        <Button type="submit" aria-label="Enviar" className="px-3"><Send className="size-4" /></Button>
      </form>
    </Card>
  )
}

function FaqForm({ tenantId, faq, nextOrder, onClose }: { tenantId: string; faq: Faq | null; nextOrder: number; onClose: () => void }) {
  const [form, setForm] = useState<FaqInput>(faq ?? { question: '', answer: '', keywords: [], active: true, order: nextOrder })
  const [keywords, setKeywords] = useState(form.keywords.join(', '))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await getDataProvider().admin.saveFaq(tenantId, { ...form, question: form.question.trim(), answer: form.answer.trim(), keywords: keywords.split(',').map((item) => item.trim()).filter(Boolean) }, faq?.id)
      onClose()
    } catch (saveError) {
      setError(errorMessage(saveError, 'No se pudo guardar.'))
      setBusy(false)
    }
  }

  return (
    <Modal title={faq ? 'Editar respuesta' : 'Nueva respuesta frecuente'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Pregunta del cliente"><input required value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} className={inputClass} placeholder="¿Cuánto cuesta un balayage?" /></Field>
        <Field label="Respuesta" hint="Escríbela como la respondería el dueño."><textarea required rows={5} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} className={inputClass} /></Field>
        <Field label="Palabras clave" hint="Separadas por coma: otras formas en que preguntan lo mismo."><input value={keywords} onChange={(event) => setKeywords(event.target.value)} className={inputClass} placeholder="precio, balayage, mechas" /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="size-4 accent-(--brand)" />Activa</label>
        {error && <Notice>{error}</Notice>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</Button></div>
      </form>
    </Modal>
  )
}

function PromptModal({ data, onClose }: { data: AdminData; onClose: () => void }) {
  const prompt = buildAssistantPrompt({ ...data, bookingUrl: typeof window === 'undefined' ? undefined : window.location.origin })
  const [copied, setCopied] = useState(false)

  return (
    <Modal title="Conocimiento del bot" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">Instrucciones que recibirá el bot con IA. Se generan automáticamente con tus servicios, horarios, equipo, productos y respuestas frecuentes.</p>
      <pre className="max-h-[50vh] overflow-auto rounded-xl bg-slate-50 p-4 text-xs whitespace-pre-wrap text-slate-700">{prompt}</pre>
      <div className="mt-4 flex justify-end"><Button variant="outline" onClick={() => navigator.clipboard.writeText(prompt).then(() => setCopied(true))}><Copy className="size-4" />{copied ? 'Copiado' : 'Copiar'}</Button></div>
    </Modal>
  )
}
