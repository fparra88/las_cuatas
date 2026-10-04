import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import Ticket from './Ticket'
import PinPad from './PinPad'
import Icono from './Icono'
import Cargando from './Cargando'
import { Modal } from './ui'
import { hoyLocal, horaLocal } from '../fecha'
import { avisar, errorDeRespuesta } from '../avisos'

const fmt = (n) => Number(n || 0).toFixed(2)

const ORIGEN_META = {
  mesa: { icono: 'mesa', label: 'Mesa' },
  barra: { icono: 'barra', label: 'Barra' },
  llevar: { icono: 'llevar', label: 'Para Llevar' },
}

const MOTIVOS = ['Error de captura', 'Cobro duplicado', 'Cliente se retiró', 'Otro']

const FILTROS = [
  { key: 'todos', label: 'Todos', prueba: () => true },
  { key: 'vigentes', label: 'Vigentes', prueba: t => !t.cancelado },
  { key: 'cancelados', label: 'Cancelados', prueba: t => t.cancelado },
]

// Paso 1 de cancelar: motivo obligatorio. El paso 2 es el PinPad.
function MotivoCancelacion({ ticket, onContinuar, onCancel }) {
  const [opcion, setOpcion] = useState('')
  const [detalle, setDetalle] = useState('')
  const motivo = opcion === 'Otro' ? detalle.trim() : [opcion, detalle.trim()].filter(Boolean).join(' — ')
  const valido = opcion && (opcion !== 'Otro' || detalle.trim())

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center sm:p-4" onClick={onCancel}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 w-full sm:max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl border-t-[6px] border-cancelado pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-7" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-cancelado-oscuro">Cancelar venta #{ticket.folio}</h2>
        <p className="mt-2 text-[#3C4A4A] leading-snug">
          {ticket.subtitulo} · ${fmt(ticket.total)} · {ticket.metodo_pago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}.
          {' '}El ticket se queda en el registro como <strong>CANCELADO</strong> y <strong>ya no suma en el corte</strong>. No se puede deshacer.
        </p>

        <p className="text-sm font-bold mt-5 mb-2">Motivo (obligatorio)</p>
        <div className="flex flex-wrap gap-2.5">
          {MOTIVOS.map(m => (
            <button
              key={m} onClick={() => setOpcion(m)}
              className={`h-12 px-5 rounded-full text-base ${opcion === m
                ? 'border-2 border-cancelado bg-cancelado-claro text-cancelado-oscuro font-bold'
                : 'border border-crema-borde bg-white font-medium'}`}
            >{m}</button>
          ))}
        </div>

        <label className="block text-sm font-bold mt-5">
          {opcion === 'Otro' ? 'Describe el motivo (obligatorio)' : 'Detalle (opcional)'}
          <textarea
            rows={2} value={detalle} maxLength={150}
            onChange={e => setDetalle(e.target.value)}
            placeholder="Ej. Se cobró la mesa equivocada"
            className="mt-2 w-full border border-crema-borde rounded-xl px-4 py-3 text-base font-normal resize-none"
          />
        </label>

        <div className="grid grid-cols-[1fr_1.4fr] gap-3 mt-5">
          <button onClick={onCancel} className="h-[60px] rounded-2xl border border-crema-borde bg-white text-lg font-bold text-marca-oscuro">Volver</button>
          <button
            onClick={() => onContinuar(motivo)} disabled={!valido}
            className="h-[60px] rounded-2xl bg-cancelado text-white text-lg font-bold disabled:opacity-40"
          >Continuar con PIN</button>
        </div>
      </div>
    </div>
  )
}

export default function Tickets({ onClose }) {
  const [lista, setLista] = useState([])
  const [fecha, setFecha] = useState(hoyLocal())
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)   // ticket completo para reimprimir
  const [error, setError] = useState('')
  const [pasoCancelar, setPasoCancelar] = useState(null)   // null | 'motivo' | 'pin'
  const [motivo, setMotivo] = useState('')
  const [cancelando, setCancelando] = useState(false)

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
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo abrir el ticket'))
      setTicket(await r.json())
    } catch (e) {
      setError(e.message)
    }
  }

  const cancelarVenta = async () => {
    setPasoCancelar(null)
    setCancelando(true)
    try {
      const r = await fetch(`${API_URL}/api/tickets/${ticket.id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo cancelar la venta'))
      setTicket(await r.json())
      avisar(`Venta #${ticket.folio} cancelada`)
      load()
    } catch (e) {
      avisar(e.message, 'error')
    } finally {
      setCancelando(false)
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
    if (ticket.cancelado && ticket.motivo_cancelacion) {
      extras.push({ label: 'Motivo', valor: ticket.motivo_cancelacion })
    }
    return (
      <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
        {ticket.cancelado && (
          <div className="no-print max-w-sm mx-auto mt-6 -mb-2 rounded-2xl bg-cancelado-claro border border-cancelado-borde px-4 py-3 flex items-center gap-3 text-cancelado-oscuro">
            <Icono nombre="prohibido" className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">Venta cancelada · no suma en el corte</p>
              {ticket.cancelado_en && <p className="text-sm">{horaLocal(ticket.cancelado_en)} · {ticket.motivo_cancelacion}</p>}
            </div>
          </div>
        )}
        <Ticket
          folio={ticket.folio}
          subtitulo={ticket.subtitulo}
          aviso={ticket.cancelado ? '** VENTA CANCELADA **' : '** REIMPRESIÓN **'}
          fechaHora={ticket.fecha_hora}
          items={ticket.items}
          total={ticket.total}
          metodo={ticket.metodo_pago}
          extras={extras}
          extraBtn={ticket.cancelado ? null : {
            label: cancelando ? 'Cancelando…' : 'Cancelar venta',
            onClick: () => !cancelando && setPasoCancelar('motivo'),
            peligro: true,
          }}
          onDone={() => setTicket(null)}
          doneLabel="← Volver a la lista"
        />

        {pasoCancelar === 'motivo' && (
          <MotivoCancelacion
            ticket={ticket}
            onCancel={() => setPasoCancelar(null)}
            onContinuar={(m) => { setMotivo(m); setPasoCancelar('pin') }}
          />
        )}
        {pasoCancelar === 'pin' && (
          <PinPad
            peligro
            titulo={`PIN para cancelar #${ticket.folio}`}
            detalle={`Motivo: ${motivo}`}
            onConfirm={cancelarVenta}
            onCancel={() => setPasoCancelar('motivo')}
          />
        )}
      </div>
    )
  }

  const visibles = lista.filter(FILTROS.find(f => f.key === filtro).prueba)
  const cuenta = (f) => lista.filter(f.prueba).length

  return (
    <Modal titulo="Tickets" onClose={onClose}>
        <div className="px-4 sm:px-7 flex flex-col sm:flex-row gap-3">
          <label className="flex-1 flex items-center gap-2.5 h-12 border border-crema-borde rounded-xl px-4 text-tinta-suave">
            <Icono nombre="buscar" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar folio (ej. 42) o mesa/nombre"
              className="flex-1 min-w-0 outline-none text-base text-tinta bg-transparent"
            />
          </label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            aria-label="Fecha"
            className={`h-12 border border-crema-borde rounded-xl px-4 font-medium ${busqueda.trim() ? 'opacity-40 pointer-events-none' : ''}`}
          />
        </div>
        {busqueda.trim() && <p className="px-4 sm:px-7 pt-2 text-xs text-tinta-suave">Buscando en todas las fechas.</p>}

        <div className="px-4 sm:px-7 pt-4 pb-3 flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.key} onClick={() => setFiltro(f.key)}
              className={`h-10 px-4 rounded-full text-sm ${filtro === f.key ? 'bg-marca text-white font-bold' : 'border border-crema-borde bg-white font-medium'}`}
            >{f.label} · {cuenta(f)}</button>
          ))}
        </div>

        <div className="px-4 sm:px-7 pb-6">
          {error && <p className="bg-cancelado-claro border border-cancelado-borde text-cancelado-oscuro font-bold rounded-xl p-3 mb-3">{error}</p>}

          {loading ? (
            <Cargando />
          ) : visibles.length === 0 ? (
            <p className="text-center text-tinta-suave py-10">
              {lista.length === 0
                ? `Sin tickets${busqueda.trim() ? ` para "${busqueda}"` : ' en esta fecha'}.`
                : 'Ningún ticket con este filtro.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {visibles.map(t => {
                const meta = ORIGEN_META[t.origen] || { icono: 'ticket', label: t.origen }
                return (
                  <button
                    key={t.id}
                    onClick={() => abrir(t.id)}
                    className={`w-full min-h-[72px] flex items-center gap-4 px-4 rounded-2xl border text-left transition-colors
                      ${t.cancelado ? 'border-cancelado-borde bg-[#FFF7F6] hover:bg-cancelado-claro' : 'border-crema-borde bg-white hover:bg-crema/60'}`}
                  >
                    <Icono nombre={meta.icono} className={`w-6 h-6 shrink-0 ${t.cancelado ? 'text-[#8A4B46]' : 'text-marca'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold truncate ${t.cancelado ? 'text-[#7A6C6A]' : ''}`}>#{t.folio} · {t.subtitulo}</span>
                        {t.cancelado && <span className="text-[11px] font-bold tracking-wider text-white bg-cancelado rounded-md px-2 py-0.5">CANCELADO</span>}
                      </div>
                      <p className={`text-sm truncate ${t.cancelado ? 'text-[#8A4B46]' : 'text-tinta-suave'}`}>
                        {horaLocal(t.fecha_hora)} · {t.metodo_pago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                        {t.cancelado && t.motivo_cancelacion ? ` · ${t.motivo_cancelacion}` : ''}
                      </p>
                    </div>
                    <p className={`text-lg font-bold shrink-0 ${t.cancelado ? 'text-[#8A7A78] line-through' : ''}`}>${fmt(t.total)}</p>
                    <Icono nombre="siguiente" className="w-5 h-5 shrink-0 text-tinta-suave" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
    </Modal>
  )
}
