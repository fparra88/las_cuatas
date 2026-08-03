import React, {useState} from 'react'
import {API_URL} from '../config'
import Ticket from './Ticket'
import PasosPago, {extrasDePago} from './PasosPago'

// Flujo de cobro de mesa:
//   confirmar -> cuenta (imprime, la mesa sigue abierta) -> PasosPago -> comprobante
// La cuenta se arma con GET /api/pedidos/mesa (no cobra nada). El POST que
// cierra la venta se dispara hasta el final, ya con metodo y sus datos.
export default function Cobro({mesaId, num, onDone, onBack}) {
  const [paso, setPaso] = useState('confirmar')
  const [cuenta, setCuenta] = useState(null)     // resumen sin cobrar
  const [ticket, setTicket] = useState(null)     // venta ya cerrada
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const pedirCuenta = async () => {
    setCargando(true)
    setError('')
    try {
      const r = await fetch(`${API_URL}/api/pedidos/mesa/${mesaId}`)
      if (!r.ok) throw new Error('No se pudo cargar la cuenta')
      const data = await r.json()
      if (!data.pedidos.length) {
        setError('La mesa no tiene pedidos.')
        return
      }
      setCuenta(data)
      setPaso('cuenta')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const cerrarVenta = async (pago) => {
    setCargando(true)
    setError('')
    try {
      const r = await fetch(`${API_URL}/api/cobros/generar-ticket`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mesa_id: mesaId, ...pago})
      })
      const data = await r.json()
      if (!r.ok) {
        // 422 de Pydantic manda una lista; los HTTPException mandan string.
        const d = data.detail
        throw new Error(Array.isArray(d) ? d[0]?.msg || 'Datos inválidos' : d || 'No se pudo cobrar')
      }
      setTicket(data)
      setPaso('comprobante')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  // ---- 1. Confirmar ----
  if (paso === 'confirmar') return (
    <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-12 text-center">
        <div className="text-7xl mb-6">💰</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">¿Generar el cobro de la Mesa {num}?</h1>
        <p className="text-gray-500 mb-10">Se imprimirá la cuenta. La mesa seguirá abierta hasta registrar el pago.</p>
        {error && <p className="bg-red-50 border border-red-200 text-red-700 font-bold rounded-xl p-3 mb-4">{error}</p>}
        <button onClick={pedirCuenta} disabled={cargando} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl mb-2 text-xl disabled:bg-gray-300">
          {cargando ? 'Cargando...' : '✅ Sí, generar cuenta'}
        </button>
        <button onClick={onBack} className="w-full bg-gray-600 text-white font-bold py-4 rounded-xl">← Volver</button>
      </div>
    </div>
  )

  // ---- 2. Cuenta (aún no se cobra) ----
  if (paso === 'cuenta') return (
    <Ticket
      subtitulo={`Mesa #${cuenta.numero_mesa}`}
      aviso="** CUENTA **"
      items={cuenta.pedidos.map(p => ({
        nombre: p.producto_nombre,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
        subtotal: p.cantidad * p.precio_unitario
      }))}
      total={cuenta.total}
      onDone={() => setPaso('pago')}
      doneLabel="💳 Registrar pago →"
      extraBtn={{label: '← Volver', onClick: onBack}}
    />
  )

  // ---- 3-4. Método + datos del pago ----
  if (paso === 'pago') return (
    <PasosPago
      total={cuenta.total}
      subtitulo={`Mesa ${num}`}
      onCobrar={cerrarVenta}
      onCancel={() => setPaso('cuenta')}
      error={error}
      cargando={cargando}
    />
  )

  // ---- 5. Comprobante de venta ----
  return (
    <Ticket
      subtitulo={`Mesa #${ticket.numero_mesa}`}
      items={ticket.pedidos.map(p => ({
        nombre: p.producto,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
        subtotal: p.subtotal
      }))}
      total={ticket.total}
      metodo={ticket.metodo_pago}
      extras={extrasDePago(ticket)}
      onDone={onDone}
      doneLabel="✅ Listo"
    />
  )
}
