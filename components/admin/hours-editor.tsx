'use client'

import { Plus, Trash2 } from 'lucide-react'
import { WEEKDAYS, type TimeRange, type Weekday, type WeeklyHours } from '@/lib/domain/types'
import { timeToMinutes } from '@/lib/domain/time'
import { inputClass } from './ui'

export const weekdayLabels: Record<Weekday, string> = { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' }

/** Devuelve un mensaje de error si algún tramo cierra antes de abrir. */
export function validateHours(hours: WeeklyHours) {
  for (const day of WEEKDAYS) {
    for (const range of hours[day]) {
      if (timeToMinutes(range.end) <= timeToMinutes(range.start)) return `Revisa el horario del ${weekdayLabels[day].toLowerCase()}: el cierre debe ser posterior a la apertura.`
    }
  }
  return null
}

export function HoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (value: WeeklyHours) => void }) {
  const setDay = (day: Weekday, ranges: TimeRange[]) => onChange({ ...value, [day]: ranges })

  return (
    <div className="divide-y divide-slate-100">
      {WEEKDAYS.map((day) => {
        const ranges = value[day]
        return (
          <div key={day} className="flex flex-wrap items-start gap-3 py-3">
            <label className="flex w-32 items-center gap-2 pt-2.5 text-sm font-medium text-slate-700"><input type="checkbox" checked={ranges.length > 0} onChange={(event) => setDay(day, event.target.checked ? [{ start: '09:00', end: '18:00' }] : [])} className="size-4 accent-(--brand)" />{weekdayLabels[day]}</label>
            <div className="grid flex-1 gap-2">
              {ranges.length === 0 && <p className="pt-2.5 text-sm text-slate-400">Cerrado</p>}
              {ranges.map((range, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="time" aria-label={`${weekdayLabels[day]} apertura`} value={range.start} onChange={(event) => setDay(day, ranges.map((item, i) => (i === index ? { ...item, start: event.target.value } : item)))} className={`${inputClass} w-32`} />
                  <span className="text-slate-400">–</span>
                  <input type="time" aria-label={`${weekdayLabels[day]} cierre`} value={range.end} onChange={(event) => setDay(day, ranges.map((item, i) => (i === index ? { ...item, end: event.target.value } : item)))} className={`${inputClass} w-32`} />
                  <button type="button" aria-label="Quitar tramo" onClick={() => setDay(day, ranges.filter((_, i) => i !== index))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
            {ranges.length > 0 && <button type="button" aria-label={`Agregar tramo el ${weekdayLabels[day].toLowerCase()}`} title="Agregar tramo (p. ej. tras el almuerzo)" onClick={() => setDay(day, [...ranges, { start: ranges[ranges.length - 1].end, end: '20:00' }])} className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-(--brand)"><Plus className="size-4" /></button>}
          </div>
        )
      })}
    </div>
  )
}
