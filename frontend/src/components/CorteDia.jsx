import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import logo from '../imagenes/logo.png'
import { TICKET_CONFIG } from '../ticketConfig'

export default function CorteDia({ onClose }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [efectuando, setEfectuando] = useState(false)
  const [imprimir, setImprimir] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const r = await fetch(`${API_URL}/api/cobros/corte?fecha=${fecha}`)
    setData(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [fecha])

  const efectuar = async () => {
    setEfectuando(true)
    setError('')
    const r = await fetch(`${API_URL}/api/cobros/efectuar-corte?fecha=${fecha}`, { method: 'POST' })
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      setError(e.detail || 'No se pudo efectuar el corte.')
      setEfectuando(false)
      setConfirmando(false)
      return
    }
    const guardado = await r.json()
    setData(guardado)
    setConfirmando(false)
    setEfectuando(false)
    setImprimir(true)
  }

  // Tras render del ticket -> imprime y cierra.
  useEffect(() => {
    if (!imprimir) return
    const t = setTimeout(() => { window.print(); onClose() }, 100)
    return () => clearTimeout(t)
  }, [imprimir])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">📊 Corte del Día</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">✕</button>
        </div>

        <div className="flex gap-3 mb-6">
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border rounded-lg px-4 py-2 flex-1 font-bold"
          />
          <button onClick={load} className="bg-teal-700 text-white px-4 py-2 rounded-lg font-bold text-xl">↻</button>
        </div>

        {loading && <p className="text-center text-gray-400 py-8">Cargando...</p>}

        {!loading && data && (
          <>
            {/* Ingresos por sección */}
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Ingresos</p>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍽️</span>
                  <span className="font-bold text-gray-700">Mesas</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl">${data.mesas.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{data.mesas.cantidad} cobro{data.mesas.cantidad !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍺</span>
                  <span className="font-bold text-gray-700">Barras</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl">${data.barras.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{data.barras.cantidad} cobro{data.barras.cantidad !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛍️</span>
                  <span className="font-bold text-gray-700">Para Llevar</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl">${data.llevar.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{data.llevar.cantidad} pedido{data.llevar.cantidad !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Total ingresos */}
            <div className="flex justify-between items-center p-4 bg-green-100 rounded-xl mb-4">
              <span className="font-bold text-green-800">Total Ingresos</span>
              <span className="font-bold text-2xl text-green-700">${data.ingresos.toFixed(2)}</span>
            </div>

            {/* Gastos */}
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Gastos</p>
            <div className="bg-red-50 rounded-xl border border-red-100 mb-2">
              {data.gastos.cantidad === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">Sin gastos registrados</p>
              ) : (
                <>
                  {data.gastos.items.map(g => (
                    <div key={g.id} className="flex justify-between px-4 py-2 border-b border-red-100 last:border-0 text-sm">
                      <span className="text-gray-700">{g.descripcion}</span>
                      <span className="font-bold text-red-600">${g.monto.toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="flex justify-between items-center p-4 bg-red-100 rounded-xl mb-6">
              <span className="font-bold text-red-800">Total Gastos</span>
              <span className="font-bold text-2xl text-red-700">${data.gastos.total.toFixed(2)}</span>
            </div>

            {/* Desglose por método de pago */}
            <p className="text-xs font-bold text-gray-400 uppercase mb-2 mt-6">Desglose</p>
            <div className="space-y-3 mb-6">
              {/* Efectivo: descuenta gastos */}
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700">💵 Efectivo</span>
                  <span className="font-bold text-xl text-green-700">${data.efectivo.neto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Bruto ${data.efectivo.bruto.toFixed(2)} − Gastos ${data.gastos.total.toFixed(2)}</span>
                  <span>en caja</span>
                </div>
              </div>
              {/* Tarjeta: solo informativo */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">💳 Tarjeta</span>
                  <span className="font-bold text-xl text-blue-700">${data.tarjeta.total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Informativo (no descuenta gastos)</p>
              </div>
            </div>

            {/* Neto */}
            <div className={`rounded-2xl p-6 text-center ${data.neto >= 0 ? 'bg-[#336666]' : 'bg-red-700'} text-white`}>
              <p className="text-sm mb-1 opacity-80">NETO DEL DÍA</p>
              <p className="text-5xl font-bold">${data.neto.toFixed(2)}</p>
              <p className="text-sm mt-2 opacity-70">{data.fecha}</p>
            </div>

            {/* Aviso: mesas/barras ocupadas bloquean el corte */}
            {data.ocupadas > 0 && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="font-bold text-amber-700">⚠️ {data.ocupadas} mesa(s)/barra(s) ocupada(s)</p>
                <p className="text-sm text-amber-600">Cobra o cierra todo antes de efectuar el corte.</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            {/* Efectuar corte */}
            <button
              onClick={() => setConfirmando(true)}
              disabled={data.ocupadas > 0}
              className="w-full mt-6 bg-[#336666] text-white font-bold py-4 rounded-xl text-lg disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              ✅ Efectuar Corte
            </button>
          </>
        )}

        {/* Confirmación efectuar corte */}
        {confirmando && (
          <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center p-6" onClick={() => setConfirmando(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
              <p className="text-4xl mb-3">⚠️</p>
              <p className="font-bold text-lg text-gray-800 mb-1">¿Estás seguro de efectuar el corte?</p>
              <p className="text-sm text-gray-500 mb-6">Corte del {data?.fecha}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setConfirmando(false)} disabled={efectuando} className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl disabled:opacity-50">Cancelar</button>
                <button onClick={efectuar} disabled={efectuando} className="bg-[#336666] text-white font-bold py-3 rounded-xl disabled:opacity-50">{efectuando ? '...' : 'Sí, efectuar'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Ticket de corte (oculto en pantalla, visible al imprimir) */}
        {imprimir && data && (
          <div id="ticket-area" className="ticket bg-white text-black print-only">
            <img src={logo} alt="logo" className="ticket-logo" />
            <div className="ticket-nombre">{TICKET_CONFIG.nombreNegocio}</div>
            <div className="ticket-sep" />
            <div className="ticket-center ticket-bold">CORTE DEL DÍA</div>
            <div className="ticket-center ticket-sm">{data.fecha}</div>
            <div className="ticket-sep" />
            <div className="ticket-item-linea"><span>Mesas ({data.mesas.cantidad})</span><span>${data.mesas.total.toFixed(2)}</span></div>
            <div className="ticket-item-linea"><span>Barras ({data.barras.cantidad})</span><span>${data.barras.total.toFixed(2)}</span></div>
            <div className="ticket-item-linea"><span>Para Llevar ({data.llevar.cantidad})</span><span>${data.llevar.total.toFixed(2)}</span></div>
            <div className="ticket-sep" />
            <div className="ticket-item-linea ticket-bold"><span>Ingresos</span><span>${data.ingresos.toFixed(2)}</span></div>
            <div className="ticket-item-linea"><span>Gastos</span><span>-${data.gastos.total.toFixed(2)}</span></div>
            <div className="ticket-sep" />
            <div className="ticket-item-linea ticket-bold"><span>Efectivo (neto)</span><span>${data.efectivo.neto.toFixed(2)}</span></div>
            <div className="ticket-item-linea ticket-sm"><span>efectivo bruto</span><span>${data.efectivo.bruto.toFixed(2)}</span></div>
            <div className="ticket-item-linea"><span>Tarjeta (info)</span><span>${data.tarjeta.total.toFixed(2)}</span></div>
            <div className="ticket-sep" />
            <div className="ticket-total"><span>NETO</span><span>${data.neto.toFixed(2)}</span></div>
            <div className="ticket-sep" />
            {TICKET_CONFIG.pie.map((l, i) => (
              <div key={i} className="ticket-center ticket-sm">{l}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
