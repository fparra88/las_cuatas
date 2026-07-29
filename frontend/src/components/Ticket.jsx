import React from 'react'
import logo from '../imagenes/logo.png'
import { TICKET_CONFIG } from '../ticketConfig'
import { printTicket } from '../printTicket'
import TicketQR from './TicketQR'

const fmt = (n) => Number(n || 0).toFixed(2)

// Ticket reutilizable para impresora térmica POS-58 (rollo 58mm, ancho útil 50mm).
// Props:
//  subtitulo  -> texto bajo encabezado (ej "Mesa #5", "Barra 2 — Juan", "Para Llevar #12")
//  items      -> [{nombre, cantidad, precio_unitario, subtotal, icono?}]
//  total      -> number
//  metodo     -> 'efectivo' | 'tarjeta' (opcional)
//  onDone     -> callback botón secundario
//  doneLabel  -> texto botón secundario (default "OK")
export default function Ticket({ subtitulo, items = [], total = 0, metodo, onDone, doneLabel = '✅ OK' }) {
  const fecha = new Date()
  return (
    <div className="min-h-screen bg-transparent p-6 flex flex-col items-center print:min-h-0 print:p-0 print:m-0 print:block">
      {/* Área imprimible */}
      <div id="ticket-area" className="ticket bg-white text-black">
        <img src={logo} alt="logo" className="ticket-logo" />
        <div className="ticket-nombre">{TICKET_CONFIG.nombreNegocio}</div>
        {TICKET_CONFIG.encabezado.map((l, i) => (
          <div key={i} className="ticket-center ticket-sm">{l}</div>
        ))}

        <div className="ticket-sep" />
        {subtitulo && <div className="ticket-center ticket-bold">{subtitulo}</div>}
        <div className="ticket-center ticket-sm">
          {fecha.toLocaleDateString()} {fecha.toLocaleTimeString()}
        </div>
        <div className="ticket-sep" />

        {items.map((it, i) => {
          const sub = it.subtotal != null ? it.subtotal : (it.precio_unitario || it.precio || 0) * it.cantidad
          const pu = it.precio_unitario != null ? it.precio_unitario : it.precio
          return (
            <div key={i} className="ticket-item">
              <div className="ticket-item-nombre">{it.nombre}</div>
              <div className="ticket-item-linea">
                <span>{it.cantidad} x {fmt(pu)}</span>
                <span>${fmt(sub)}</span>
              </div>
            </div>
          )
        })}

        <div className="ticket-sep" />
        <div className="ticket-total">
          <span>TOTAL</span>
          <span>${fmt(total)}</span>
        </div>
        {metodo && (
          <div className="ticket-center ticket-sm">
            {metodo === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
          </div>
        )}

        <div className="ticket-sep" />
        {TICKET_CONFIG.pie.map((l, i) => (
          <div key={i} className="ticket-center ticket-sm">{l}</div>
        ))}
        {TICKET_CONFIG.qrUrl && (
          <div className="ticket-center" style={{ marginTop: '2mm' }}>
            <TicketQR url={TICKET_CONFIG.qrUrl} />
          </div>
        )}
      </div>

      {/* Botones — no se imprimen */}
      <div className="no-print w-full max-w-xs mt-6">
        <button onClick={printTicket} className="w-full bg-blue-600 text-white font-bold py-3 mb-2 rounded">🖨️ Imprimir</button>
        {onDone && <button onClick={onDone} className="w-full bg-green-600 text-white font-bold py-3 rounded">{doneLabel}</button>}
      </div>
    </div>
  )
}
