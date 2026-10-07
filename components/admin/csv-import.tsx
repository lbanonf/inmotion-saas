'use client'

import { useState } from 'react'
import { Button, Field, inputClass, Modal, Notice } from './ui'

/** Separa una línea CSV respetando comillas dobles. Acepta coma o punto y coma. */
export function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const delimiter = lines[0]?.includes(';') && !lines[0].includes(',') ? ';' : ','
  return lines.map((line) => {
    const cells: string[] = []
    let current = ''
    let quoted = false
    for (const char of line) {
      if (char === '"') quoted = !quoted
      else if (char === delimiter && !quoted) {
        cells.push(current.trim())
        current = ''
      } else current += char
    }
    cells.push(current.trim())
    return cells
  })
}

type CsvImportProps<T> = {
  title: string
  columns: string[]
  example: string
  /** Convierte una fila en un registro o lanza un error con el motivo. */
  toRecord: (cells: string[], index: number) => T
  onImport: (records: T[]) => Promise<void>
  onClose: () => void
}

export function CsvImportModal<T>({ title, columns, example, toRecord, onImport, onClose }: CsvImportProps<T>) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    let rows = parseCsv(text)
    if (rows[0]?.[0]?.toLowerCase() === columns[0].toLowerCase()) rows = rows.slice(1)
    const records: T[] = []
    for (const [index, row] of rows.entries()) {
      try {
        records.push(toRecord(row, index))
      } catch (rowError) {
        return setError(`Fila ${index + 1}: ${rowError instanceof Error ? rowError.message : 'formato inválido'}`)
      }
    }
    if (records.length === 0) return setError('No hay filas para importar.')
    setBusy(true)
    try {
      await onImport(records)
      onClose()
    } catch {
      setError('No se pudo importar. Inténtalo de nuevo.')
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-sm text-slate-500">Pega filas desde Excel o Google Sheets (CSV). Columnas: <span className="font-medium text-slate-700">{columns.join(', ')}</span>.</p>
        <Field label="Datos"><textarea rows={8} value={text} onChange={(event) => setText(event.target.value)} className={`${inputClass} font-mono text-xs`} placeholder={example} /></Field>
        {error && <Notice>{error}</Notice>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Importando...' : 'Importar'}</Button></div>
      </form>
    </Modal>
  )
}

export function toNumber(value: string | undefined, field: string) {
  const parsed = Number((value ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'))
  if (!value || Number.isNaN(parsed)) throw new Error(`"${field}" debe ser un número`)
  return parsed
}
