import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import AgregarPedido from './AgregarPedido'
import Ticket from './Ticket'
import PasosPago, {extrasDePago} from './PasosPago'

export default function Barras() {
  const [barras, setBarras] = useState([])
  const [vista, setVista] = useState('grid')
  const [barra, setBarra] = useState(null)
  const [comensales, setComensales] = useState([])
  const [comensal, setComensal] = useState(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [resumen, setResumen] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [errorCobro, setErrorCobro] = useState('')
  const [cobrando, setCobrando] = useState(false)

  const loadBarras = async () => {
    const r = await fetch(`${API_URL}/api/mesas?tipo=barra`)
    setBarras(await r.json())
  }

  const loadComensales = async (barraId) => {
    const r = await fetch(`${API_URL}/api/comensales/barra/${barraId}`)
    setComensales(await r.json())
  }

  const loadResumen = async (comensalId) => {
    const r = await fetch(`${API_URL}/api/pedidos/comensal/${comensalId}`)
    setResumen(await r.json())
  }

  useEffect(() => {
    loadBarras()
    const i = setInterval(loadBarras, 5000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    if (vista !== 'barra' || !barra) return
    loadComensales(barra.id)
    const i = setInterval(() => loadComensales(barra.id), 3000)
    return () => clearInterval(i)
  }, [vista, barra])

  useEffect(() => {
    if (vista !== 'comensal' || !comensal) return
    loadResumen(comensal.id)
    const i = setInterval(() => loadResumen(comensal.id), 3000)
    return () => clearInterval(i)
  }, [vista, comensal])

  const agregarComensal = async () => {
    if (!nuevoNombre.trim()) return
    await fetch(`${API_URL}/api/comensales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barra_id: barra.id, nombre: nuevoNombre.trim() })
    })
    setNuevoNombre('')
    loadComensales(barra.id)
  }

  const eliminarComensal = async (id) => {
    if (confirm('¿Eliminar comensal y sus pedidos?')) {
      await fetch(`${API_URL}/api/comensales/${id}`, { method: 'DELETE' })
      loadComensales(barra.id)
    }
  }

  const updateQty = async (pedidoId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      await fetch(`${API_URL}/api/pedidos/pedido/${pedidoId}`, { method: 'DELETE' })
    } else {
      await fetch(`${API_URL}/api/pedidos/pedido/${pedidoId}?cantidad=${nuevaCantidad}`, { method: 'PUT' })
    }
    loadResumen(comensal.id)
  }

  // El pago se cierra hasta el final; la cuenta previa solo se imprime.
  const cobrar = async (pago) => {
    setCobrando(true)
    setErrorCobro('')
    const q = new URLSearchParams({ comensal_id: comensal.id, metodo_pago: pago.metodo_pago })
    if (pago.codigo_cobro) q.set('codigo_cobro', pago.codigo_cobro)
    if (pago.monto_recibido != null) q.set('monto_recibido', pago.monto_recibido)
    try {
      const r = await fetch(`${API_URL}/api/cobros/cobrar-comensal?${q}`, { method: 'POST' })
      const data = await r.json()
      if (!r.ok) {
        const d = data.detail
        throw new Error(Array.isArray(d) ? d[0]?.msg || 'Datos inválidos' : d || 'No se pudo cobrar')
      }
      setTicket(data)
      setVista('ticket')
      loadBarras()
    } catch (e) {
      setErrorCobro(e.message)
    } finally {
      setCobrando(false)
    }
  }

  const color = (e) => ({ disponible: 'bg-white/40', ocupada: 'bg-red-500/20' }[e] || 'bg-gray-400/40')

  // COMPROBANTE (venta ya cerrada)
  if (vista === 'ticket' && ticket) return (
    <Ticket
      subtitulo={`Barra ${barra?.displayNum} — ${ticket.nombre}`}
      items={ticket.pedidos.map(p => ({nombre: p.producto, cantidad: p.cantidad, precio_unitario: p.precio_unitario, subtotal: p.subtotal}))}
      total={ticket.total}
      metodo={ticket.metodo_pago}
      extras={extrasDePago(ticket)}
      doneLabel="✅ Listo"
      onDone={() => { setTicket(null); setComensal(null); setResumen(null); setVista('barra'); loadComensales(barra.id) }}
    />
  )

  // 1. CONFIRMAR
  if (vista === 'confirmar' && comensal) return (
    <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-12 text-center">
        <div className="text-7xl mb-6">💰</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">¿Generar el cobro de {comensal.nombre}?</h1>
        <p className="text-gray-500 mb-10">Barra {barra?.displayNum} · Se imprimirá la cuenta. El comensal seguirá abierto hasta registrar el pago.</p>
        <button onClick={() => { setErrorCobro(''); setVista('cuenta') }} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl mb-2 text-xl">✅ Sí, generar cuenta</button>
        <button onClick={() => setVista('comensal')} className="w-full bg-gray-600 text-white font-bold py-4 rounded-xl">← Volver</button>
      </div>
    </div>
  )

  // 2. CUENTA (aún no se cobra)
  if (vista === 'cuenta' && comensal && resumen) return (
    <Ticket
      subtitulo={`Barra ${barra?.displayNum} — ${comensal.nombre}`}
      aviso="** CUENTA **"
      items={resumen.pedidos.map(p => ({
        nombre: p.producto_nombre,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
        subtotal: p.cantidad * p.precio_unitario
      }))}
      total={resumen.total}
      onDone={() => setVista('pago')}
      doneLabel="💳 Registrar pago →"
      extraBtn={{label: '← Volver', onClick: () => setVista('comensal')}}
    />
  )

  // 3-4. MÉTODO + DATOS DEL PAGO
  if (vista === 'pago' && comensal && resumen) return (
    <PasosPago
      total={resumen.total}
      subtitulo={`Barra ${barra?.displayNum} — ${comensal.nombre}`}
      onCobrar={cobrar}
      onCancel={() => setVista('cuenta')}
      error={errorCobro}
      cargando={cobrando}
    />
  )

  // AGREGAR PEDIDO
  if (vista === 'pedidos' && comensal) return (
    <AgregarPedido comensalId={comensal.id} onBack={() => setVista('comensal')} onAdd={() => setVista('comensal')} />
  )

  // COMENSAL RESUMEN
  if (vista === 'comensal' && comensal) return (
    <div className="min-h-screen bg-transparent p-6">
      <button onClick={() => { setVista('barra'); setComensal(null); setResumen(null) }} className="mb-6 bg-gray-600 text-white font-bold py-2 px-4 rounded">← Barra {barra?.displayNum}</button>
      <h1 className="text-4xl font-bold text-yellow-700 mb-2">👤 {comensal.nombre}</h1>
      <p className="text-gray-500 mb-8">Barra {barra?.displayNum}</p>
      <div className="bg-white rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6">Pedidos</h2>
        {(!resumen || resumen.pedidos.length === 0) && <p className="text-gray-400 text-center py-4">Sin pedidos aún</p>}
        {resumen?.pedidos?.map(p => (
          <div key={p.id} className="flex justify-between items-center mb-4 p-4 bg-yellow-50 rounded">
            <div className="flex-1">
              <p className="font-bold">{p.producto_nombre}</p>
              <p className="text-sm text-gray-500">${p.precio_unitario} c/u</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => updateQty(p.id, p.cantidad - 1)} className="w-8 h-8 bg-red-500 text-white rounded-full font-bold">-</button>
              <span className="font-bold text-lg w-6 text-center">{p.cantidad}</span>
              <button onClick={() => updateQty(p.id, p.cantidad + 1)} className="w-8 h-8 bg-green-500 text-white rounded-full font-bold">+</button>
              <p className="font-bold w-20 text-right">${(p.cantidad * p.precio_unitario).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
      {resumen && (
        <div className="bg-yellow-600 text-white rounded-2xl p-8 mb-8">
          <p className="text-5xl font-bold">TOTAL: ${resumen.total.toFixed(2)}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setVista('pedidos')} className="bg-blue-500 text-white font-bold py-4 rounded-xl">🛒 Agregar</button>
        <button
          onClick={() => resumen?.pedidos?.length && setVista('confirmar')}
          className={`font-bold py-4 rounded-xl ${resumen?.pedidos?.length ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-400 cursor-not-allowed'}`}
        >💰 Cobrar</button>
      </div>
    </div>
  )

  // BARRA - LISTA COMENSALES
  if (vista === 'barra' && barra) return (
    <div className="min-h-screen bg-transparent p-6">
      <button onClick={() => { setVista('grid'); setBarra(null); setComensales([]) }} className="mb-6 bg-gray-600 text-white font-bold py-2 px-4 rounded">← Barras</button>
      <h1 className="text-4xl font-bold text-orange-700 mb-8">🍺 Barra {barra.displayNum}</h1>

      <div className="bg-white rounded-2xl p-6 mb-8">
        <h2 className="font-bold text-xl mb-4">Nuevo Comensal</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarComensal()}
            placeholder="Nombre..."
            className="flex-1 border rounded-xl px-4 py-3 text-lg"
          />
          <button onClick={agregarComensal} className="bg-[#336666] text-white font-bold px-6 py-3 rounded-xl">+ Agregar</button>
        </div>
      </div>

      {comensales.length === 0 ? (
        <div className="text-center text-gray-400 mt-8">
          <p className="text-6xl mb-4">👤</p>
          <p className="text-xl">Sin comensales. Agrega uno arriba.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comensales.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-6 flex justify-between items-center hover:shadow-lg">
              <button onClick={() => { setComensal(c); setResumen(null); setVista('comensal') }} className="flex items-center gap-4 flex-1 text-left">
                <span className="text-4xl">👤</span>
                <span className="font-bold text-xl">{c.nombre}</span>
              </button>
              <button onClick={() => eliminarComensal(c.id)} className="text-red-400 hover:text-red-600 text-2xl ml-4">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // GRID BARRAS
  return (
    <div className="min-h-screen bg-transparent p-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-orange-700 mb-8">Barras</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {barras.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => { setBarra({ ...b, displayNum: idx + 1 }); setComensales([]); setVista('barra') }}
              className={`${color(b.estado)} rounded-2xl border-4 p-8 hover:scale-105 transition-transform`}
            >
              <div className="text-6xl mb-4">🍺</div>
              <div className="text-2xl font-bold mb-2">Barra {idx + 1}</div>
              <div className="text-xs uppercase">{b.estado}</div>
            </button>
          ))}
        </div>
        <div className="mt-12 bg-white rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div><p className="text-3xl font-bold text-green-600">{barras.filter(b => b.estado === 'disponible').length}</p><p>Disponibles</p></div>
            <div><p className="text-3xl font-bold text-red-600">{barras.filter(b => b.estado === 'ocupada').length}</p><p>Ocupadas</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
