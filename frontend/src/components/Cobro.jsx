import React, {useEffect, useState} from 'react'
import {API_URL} from '../config'
import Ticket from './Ticket'

export default function Cobro({mesaId, num, onDone, onBack}) {
  const [metodo, setMetodo] = useState('efectivo')
  const [ticket, setTicket] = useState(null)

  const pagar = async () => {
    const r = await fetch(`${API_URL}/api/cobros/generar-ticket`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({mesa_id: mesaId, metodo_pago: metodo})})
    setTicket(await r.json())
  }

  if(ticket) return (
    <Ticket
      subtitulo={`Mesa #${ticket.numero_mesa}`}
      items={ticket.pedidos.map(p => ({nombre: p.producto, cantidad: p.cantidad, precio_unitario: p.precio_unitario, subtotal: p.subtotal}))}
      total={ticket.total}
      metodo={metodo}
      onDone={onDone}
    />
  )

  return (
    <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-12">
        <h1 className="text-5xl font-bold text-green-700 text-center mb-10">💰 Cobro</h1>
        <div className="grid grid-cols-2 gap-6 mb-10">
          <button onClick={() => setMetodo('efectivo')} className={`p-8 rounded-2xl border-4 ${metodo === 'efectivo' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>
            <div className="text-6xl mb-3">💵</div>
            <p className="font-bold">EFECTIVO</p>
          </button>
          <button onClick={() => setMetodo('tarjeta')} className={`p-8 rounded-2xl border-4 ${metodo === 'tarjeta' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            <div className="text-6xl mb-3">💳</div>
            <p className="font-bold">TARJETA</p>
          </button>
        </div>
        <button onClick={pagar} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl mb-2">✅ Confirmar</button>
        <button onClick={onBack} className="w-full bg-gray-600 text-white font-bold py-4 rounded-xl">← Volver</button>
      </div>
    </div>
  )
}
