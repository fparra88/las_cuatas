import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import logo from '../imagenes/ticket.png'
import { TICKET_CONFIG } from '../ticketConfig'
import { printTicket } from '../printTicket'
import { hoyLocal, horaLocal } from '../fecha'
import { errorDeRespuesta } from '../avisos'
import Icono from './Icono'
import Cargando from './Cargando'
import Confirmar from './Confirmar'
import { Modal } from './ui'

const fmt = (n) => Number(n || 0).toFixed(2)
const plural = (n, s) => `${n} ${s}${n !== 1 ? 's' : ''}`

export default function CorteDia({ onClose }) {
  const [fecha, setFecha] = useState(hoyLocal())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [efectuando, setEfectuando] = useState(false)
  const [imprimir, setImprimir] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    // Antes no habia try/catch: si el servidor fallaba, el modal se quedaba en
    // "Cargando..." para siempre.
    try {
      const r = await fetch(`${API_URL}/api/cobros/corte?fecha=${fecha}`)
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo cargar el corte.'))
      setData(await r.json())
    } catch (e) {
      setData(null)
      setError(e.message === 'Failed to fetch' ? 'Sin conexión con el servidor.' : e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [fecha])

  const efectuar = async () => {
    setEfectuando(true)
    setError('')
    try {
      const r = await fetch(`${API_URL}/api/cobros/efectuar-corte?fecha=${fecha}`, { method: 'POST' })
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo efectuar el corte.'))
      setData(await r.json())
      setImprimir(true)
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'Sin conexión con el servidor.' : e.message)
    } finally {
      setEfectuando(false)
      setConfirmando(false)
    }
  }

  // Tras render del ticket -> imprime y cierra.
  useEffect(() => {
    if (!imprimir) return
    const t = setTimeout(async () => { await printTicket(); onClose() }, 100)
    return () => clearTimeout(t)
  }, [imprimir])

  const cancelados = data?.cancelados || { cantidad: 0, total: 0, items: [] }

  return (
    <Modal titulo="Corte del día" onClose={onClose} ancho="sm:max-w-md">
        <div className="px-4 sm:px-7 pb-7">
          <div className="flex gap-3 mb-5">
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              aria-label="Fecha del corte"
              className="h-12 border border-crema-borde rounded-xl px-4 flex-1 font-medium"
            />
            <button onClick={load} aria-label="Recargar" className="w-12 h-12 rounded-xl bg-marca text-white flex items-center justify-center">
              <Icono nombre="recargar" className="w-6 h-6" />
            </button>
          </div>

          {loading && <Cargando />}

          {!loading && !data && error && (
            <div className="p-4 bg-cancelado-claro border border-cancelado-borde rounded-xl text-center">
              <p className="font-bold text-cancelado-oscuro">{error}</p>
              <button onClick={load} className="mt-3 h-11 px-5 rounded-xl bg-marca text-white font-bold">Reintentar</button>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Ingresos por sección */}
              <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5 mb-4">
                {[['Mesas', data.mesas, 'cobro'], ['Barras', data.barras, 'cobro'], ['Para llevar', data.llevar, 'pedido']].map(([label, s, unidad]) => (
                  <div key={label} className="bg-crema rounded-2xl p-3.5">
                    <p className="text-xs text-tinta-suave">{label}</p>
                    <p className="text-xl font-bold">${fmt(s.total)}</p>
                    <p className="text-xs text-tinta-suave">{plural(s.cantidad, unidad)}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-baseline border-b border-crema-linea pb-3 mb-4">
                <span className="font-bold">Total ingresos</span>
                <span className="text-3xl font-bold text-marca-oscuro">${fmt(data.ingresos)}</span>
              </div>

              {/* Gastos */}
              <p className="text-xs font-bold text-tinta-suave uppercase tracking-wide mb-2">Gastos</p>
              <div className="rounded-2xl border border-crema-borde mb-4">
                {data.gastos.cantidad === 0 ? (
                  <p className="text-center text-tinta-suave py-4 text-sm">Sin gastos registrados</p>
                ) : (
                  data.gastos.items.map(g => (
                    <div key={g.id} className="flex justify-between px-4 py-2.5 border-b border-crema-linea last:border-0 text-sm">
                      <span>{g.descripcion}</span>
                      <span className="font-bold text-cancelado">−${fmt(g.monto)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Desglose por método de pago */}
              <div className="flex flex-col gap-2 text-[15px] mb-4">
                <div className="flex justify-between"><span>Efectivo bruto</span><span className="font-bold">${fmt(data.efectivo.bruto)}</span></div>
                <div className="flex justify-between"><span>Gastos (efectivo)</span><span className="font-bold text-cancelado">−${fmt(data.gastos.total)}</span></div>
                <div className="flex justify-between text-lg"><span className="font-bold">Efectivo en caja</span><span className="font-bold text-marca-oscuro">${fmt(data.efectivo.neto)}</span></div>
                <div className="flex justify-between text-tinta-suave"><span>Tarjeta (informativo)</span><span className="font-bold">${fmt(data.tarjeta.total)}</span></div>
              </div>

              {/* Cancelados: visibles, pero fuera de todos los totales de arriba */}
              {cancelados.cantidad > 0 && (
                <div className="rounded-2xl bg-[#FFF7F6] border border-cancelado-borde p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Icono nombre="prohibido" className="w-6 h-6 text-cancelado shrink-0" />
                    <p className="flex-1 font-bold text-cancelado-oscuro">{plural(cancelados.cantidad, 'venta cancelada')} · no suman</p>
                    <p className="font-bold text-[#8A7A78] line-through">${fmt(cancelados.total)}</p>
                  </div>
                  <div className="mt-2 pl-9 flex flex-col gap-1">
                    {cancelados.items.map((c, i) => (
                      <p key={i} className="text-sm text-[#8A4B46]">
                        #{c.folio ?? '—'} · {c.subtitulo} · ${fmt(c.total)}{c.motivo ? ` · ${c.motivo}` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Neto */}
              <div className={`rounded-2xl p-5 text-center text-white ${data.neto >= 0 ? 'bg-marca' : 'bg-cancelado'}`}>
                <p className="text-sm opacity-80">NETO DEL DÍA</p>
                <p className="text-5xl font-bold">${fmt(data.neto)}</p>
                <p className="text-sm mt-1 opacity-70">{data.fecha}</p>
              </div>

              {/* Aviso: este dia ya se cerro. Solo se puede cortar una vez. */}
              {data.cerrado && (
                <div className="mt-4 p-4 bg-crema border border-crema-borde rounded-xl text-center">
                  <p className="font-bold flex items-center justify-center gap-2"><Icono nombre="candado" /> Día ya cerrado (corte #{data.cerrado.id})</p>
                  <p className="text-sm text-tinta-suave">
                    Neto ${fmt(data.cerrado.neto)} · efectivo ${fmt(data.cerrado.efectivo_neto)} · {horaLocal(data.cerrado.creado_en)}
                  </p>
                  {data.ingresos !== 0 && (
                    <p className="text-sm text-amber-700 mt-1">Hay ${fmt(data.ingresos)} registrados después del corte.</p>
                  )}
                </div>
              )}

              {/* Aviso: mesas/barras ocupadas bloquean el corte */}
              {data.ocupadas > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="font-bold text-amber-800">{data.ocupadas} mesa(s)/barra(s) ocupada(s)</p>
                  <p className="text-sm text-amber-700">Cobra o cierra todo antes de efectuar el corte.</p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-cancelado-claro border border-cancelado-borde rounded-xl text-center text-sm font-bold text-cancelado-oscuro">
                  {error}
                </div>
              )}

              <button
                onClick={() => setConfirmando(true)}
                disabled={data.ocupadas > 0 || !!data.cerrado}
                className="w-full mt-5 h-[60px] bg-terracota text-white font-bold rounded-2xl text-lg disabled:bg-crema-borde disabled:text-tinta-suave disabled:cursor-not-allowed"
              >
                Efectuar corte
              </button>
            </>
          )}
        </div>

        {confirmando && (
          <Confirmar
            titulo="¿Efectuar el corte?"
            mensaje={`Corte del ${data?.fecha}. Solo se puede hacer una vez por día.`}
            confirmarLabel="Sí, efectuar"
            cargando={efectuando}
            onConfirm={efectuar}
            onCancel={() => setConfirmando(false)}
          />
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
            <div className="ticket-item-linea"><span>Mesas ({data.mesas.cantidad})</span><span>${fmt(data.mesas.total)}</span></div>
            <div className="ticket-item-linea"><span>Barras ({data.barras.cantidad})</span><span>${fmt(data.barras.total)}</span></div>
            <div className="ticket-item-linea"><span>Para Llevar ({data.llevar.cantidad})</span><span>${fmt(data.llevar.total)}</span></div>
            <div className="ticket-sep" />
            <div className="ticket-item-linea ticket-bold"><span>Ingresos</span><span>${fmt(data.ingresos)}</span></div>
            <div className="ticket-item-linea"><span>Gastos</span><span>-${fmt(data.gastos.total)}</span></div>
            <div className="ticket-sep" />
            <div className="ticket-item-linea ticket-bold"><span>Efectivo (neto)</span><span>${fmt(data.efectivo.neto)}</span></div>
            <div className="ticket-item-linea ticket-sm"><span>efectivo bruto</span><span>${fmt(data.efectivo.bruto)}</span></div>
            <div className="ticket-item-linea"><span>Tarjeta (info)</span><span>${fmt(data.tarjeta.total)}</span></div>
            {cancelados.cantidad > 0 && (
              <div className="ticket-item-linea ticket-sm"><span>Cancelados ({cancelados.cantidad}) no suman</span><span>${fmt(cancelados.total)}</span></div>
            )}
            <div className="ticket-sep" />
            <div className="ticket-total"><span>NETO</span><span>${fmt(data.neto)}</span></div>
            <div className="ticket-sep" />
            {TICKET_CONFIG.pie.map((l, i) => (
              <div key={i} className="ticket-center ticket-sm">{l}</div>
            ))}
          </div>
        )}
    </Modal>
  )
}
