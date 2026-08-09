import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import Ticket from './Ticket'
import { hoyLocal, horaLocal } from '../fecha'

const fmt = (n) => Number(n || 0).toFixed(2)

const ORIGEN_META = {
  mesa: { icono: '🍽️', label: 'Mesa' },
  barra: { icono: '🍺', label: 'Barra' },
  llevar: { icono: '🛍️', label: 'Para Llevar' },
}

export default function Tickets({ onClose }) {
  const [lista, setLista] = useState([])
  const [fecha, setFecha] = useState(hoyLocal())
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)   // ticket completo para reimprimir
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      // Al buscar por folio se ignora la fecha: un ticket de otro día debe
      // encontrarse tecleando su número sin tener que adivinar el día.
      const q = busqueda.trim()
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      else params.set('fecha', fecha)
      const r = await fetch(`${API_URL}/api/tickets?${params}`)
      if (!r.ok) throw new Error('No se pudo cargar la lista')
      setLista(await r.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Un solo effect para ambos filtros: con uno por cada uno, el montaje
  // disparaba dos fetch. Debounce para no pegarle al servidor por tecla.
  useEffect(() => {
    const t = setTimeout(load, busqueda ? 300 : 0)
    return () => clearTimeout(t)
  }, [fecha, busqueda])

  const abrir = async (id) => {
    setError('')
    try {
      const r = await fetch(`${API_URL}/api/tickets/${id}`)
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'No se pudo abrir el ticket')
      setTicket(data)
    } catch (e) {
      setError(e.message)
    }
  }

  // REIMPRESIÓN — reemplaza la lista: #ticket-area es un id, no puede haber dos.
  if (ticket) {
    const extras = []
    if (ticket.codigo_cobro) extras.push({ label: 'Cod. cobro', valor: ticket.codigo_cobro })
    if (ticket.monto_recibido != null) {
      extras.push({ label: 'Recibido', valor: `$${fmt(ticket.monto_recibido)}` })
      extras.push({ label: 'Cambio', valor: `$${fmt(ticket.cambio)}` })
    }
    return (
      <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
        <Ticket
          folio={ticket.folio}
          subtitulo={ticket.subtitulo}
          aviso="** REIMPRESIÓN **"
          fechaHora={ticket.fecha_hora}
          items={ticket.items}
          total={ticket.total}
          metodo={ticket.metodo_pago}
          extras={extras}
          onDone={() => setTicket(null)}
          doneLabel="← Volver a la lista"
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🧾 Tickets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">✕</button>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por folio (ej. 42) o por mesa/nombre..."
          className="w-full border rounded-xl px-4 py-3 mb-3 text-lg"
        />

        <div className={`flex items-center gap-3 mb-4 ${busqueda.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
          <label className="font-bold text-gray-600 text-sm">Fecha:</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border rounded-lg px-3 py-2 font-bold flex-1"
          />
        </div>
        {busqueda.trim() && (
          <p className="text-xs text-gray-400 mb-3">Buscando en todas las fechas.</p>
        )}

        {error && <p className="bg-red-50 border border-red-200 text-red-700 font-bold rounded-xl p-3 mb-4">{error}</p>}

        {loading ? (
          <p className="text-center text-gray-400 py-8">Cargando...</p>
        ) : lista.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Sin tickets{busqueda.trim() ? ` para "${busqueda}"` : ' en esta fecha'}.</p>
        ) : (
          <div className="space-y-2">
            {lista.map(t => {
              const meta = ORIGEN_META[t.origen] || { icono: '🧾', label: t.origen }
              return (
                <button
                  key={t.id}
                  onClick={() => abrir(t.id)}
                  className="w-full flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{meta.icono}</span>
                    <div className="min-w-0">
                      <p className="font-bold truncate">#{t.folio} · {t.subtitulo}</p>
                      <p className="text-xs text-gray-500">
                        {horaLocal(t.fecha_hora)} · {t.metodo_pago === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-bold">${fmt(t.total)}</p>
                    <span className="bg-[#336666] text-white font-bold text-sm py-2 px-3 rounded-lg">🖨️</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
