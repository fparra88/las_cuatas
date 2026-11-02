import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import { TZ } from '../fecha'
import { avisar, errorDeRespuesta } from '../avisos'

const fmt = (n) => Number(n || 0).toFixed(2)
// 'YYYY-MM-DD' -> "lun 26 oct". Mediodia UTC para que la zona no mueva el dia.
const diaCorto = (s) =>
  new Date(`${s}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })

// Renta y Sueldos: monto diario que el corte descuenta solo de lunes a viernes,
// y el apartado acumulado de la semana (se paga el viernes, el lunes vuelve a 0).
export default function GastosFijos({ fecha, recarga }) {
  const [datos, setDatos] = useState(null)
  const [montos, setMontos] = useState({})      // id -> texto del input
  const [guardando, setGuardando] = useState(null)

  const load = async () => {
    try {
      const r = await fetch(`${API_URL}/api/gastos/fijos?fecha=${fecha}`)
      if (!r.ok) throw new Error()
      const d = await r.json()
      setDatos(d)
      setMontos(Object.fromEntries(d.fijos.map(f => [f.id, String(f.monto_diario)])))
    } catch {
      avisar('No se pudieron cargar los gastos fijos', 'error')
    }
  }

  useEffect(() => { load() }, [fecha, recarga])

  const guardar = async (f) => {
    const valor = parseFloat(montos[f.id])
    if (isNaN(valor) || valor < 0) return avisar('Escribe un monto de cero o más.', 'error')
    setGuardando(f.id)
    try {
      const r = await fetch(`${API_URL}/api/gastos/fijos/${f.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_diario: valor })
      })
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo guardar el monto'))
      avisar(`${f.nombre}: $${valor.toFixed(2)} por día`)
      load()
    } catch (e) {
      avisar(e.message === 'Failed to fetch' ? 'Sin conexión: el monto no se guardó' : e.message, 'error')
    } finally {
      setGuardando(null)
    }
  }

  if (!datos) return null
  const s = datos.semana

  return (
    <div className="bg-white rounded-3xl border border-crema-borde p-6 mb-5">
      <h3 className="font-bold text-xl">Gastos fijos</h3>
      <p className="text-sm text-tinta-suave mb-4">Se descuentan solos en el corte de lunes a viernes.</p>

      <div className="flex flex-col gap-3 mb-5">
        {datos.fijos.map(f => {
          const cambiado = parseFloat(montos[f.id]) !== f.monto_diario
          return (
            <div key={f.id} className="flex items-center gap-3">
              <label htmlFor={`fijo-${f.id}`} className="font-bold w-20 shrink-0">{f.nombre}</label>
              <input
                id={`fijo-${f.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={montos[f.id] ?? ''}
                onChange={e => setMontos(m => ({ ...m, [f.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && guardar(f)}
                className="flex-1 min-w-0 h-12 border border-crema-borde rounded-xl px-4 text-lg"
              />
              <span className="text-sm text-tinta-suave shrink-0">/ día</span>
              <button onClick={() => guardar(f)} disabled={!cambiado || guardando === f.id}
                      className="h-12 px-4 rounded-xl bg-marca text-white font-bold disabled:opacity-40">
                {guardando === f.id ? '…' : 'Guardar'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Apartado semanal: el viernes se resalta como lo que hay que pagar. */}
      <div className={`rounded-2xl p-5 ${s.es_viernes ? 'bg-marca-oscuro text-white' : 'bg-crema'}`}>
        <p className={`text-sm ${s.es_viernes ? 'opacity-80' : 'text-tinta-suave'}`}>
          {s.es_viernes ? 'A PAGAR HOY · ' : 'Apartado de la semana · '}{diaCorto(s.desde)} – {diaCorto(s.hasta)}
        </p>
        <div className="flex flex-col gap-1 my-2 text-[15px]">
          {s.items.map(i => (
            <div key={i.id} className="flex justify-between"><span>{i.nombre}</span><span className="font-bold">${fmt(i.total_con_hoy)}</span></div>
          ))}
        </div>
        <div className="flex justify-between items-baseline">
          <span className="font-bold">Total</span>
          <span className="text-3xl font-bold">${fmt(s.total_con_hoy)}</span>
        </div>
        {s.pendiente_hoy > 0 && (
          <p className={`text-sm mt-1 ${s.es_viernes ? 'opacity-80' : 'text-tinta-suave'}`}>
            Incluye ${fmt(s.pendiente_hoy)} de hoy, que se descuentan al hacer el corte.
          </p>
        )}
      </div>
    </div>
  )
}
