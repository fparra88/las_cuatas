import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import Ticket from './Ticket'

export default function ParaLlevar() {
  const [tab, setTab] = useState('pedido')
  const [prods, setProds] = useState([])
  const [cats, setCats] = useState([])
  const [cat, setCat] = useState('')
  const [carrito, setCarrito] = useState({})
  const [vista, setVista] = useState('productos')
  const [metodo, setMetodo] = useState('efectivo')
  const [ticket, setTicket] = useState(null)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [historial, setHistorial] = useState([])

  useEffect(() => {
    const load = async () => {
      const r = await fetch(`${API_URL}/api/productos/categorias`)
      const c = await r.json()
      setCats(c)
      if (c.length) setCat(c[0])
    }
    load()
  }, [])

  useEffect(() => {
    if (!cat) return
    const load = async () => {
      const r = await fetch(`${API_URL}/api/productos?categoria=${cat}`)
      setProds(await r.json())
    }
    load()
  }, [cat])

  useEffect(() => {
    if (tab !== 'historial') return
    loadHistorial()
  }, [tab, fecha])

  const loadHistorial = async () => {
    const r = await fetch(`${API_URL}/api/para-llevar?fecha=${fecha}`)
    setHistorial(await r.json())
  }

  const addToCart = (p) => {
    setCarrito(prev => ({
      ...prev,
      [p.id]: prev[p.id]
        ? { ...prev[p.id], cantidad: prev[p.id].cantidad + 1 }
        : { nombre: p.nombre, precio: p.precio, icono: p.icono || '🍽️', cantidad: 1 }
    }))
  }

  const changeQty = (id, delta) => {
    setCarrito(prev => {
      const next = { ...prev }
      const nueva = (next[id]?.cantidad || 0) + delta
      if (nueva <= 0) {
        delete next[id]
      } else {
        next[id] = { ...next[id], cantidad: nueva }
      }
      return next
    })
  }

  const totalCarrito = Object.values(carrito).reduce((a, i) => a + i.precio * i.cantidad, 0)
  const countCarrito = Object.values(carrito).reduce((a, i) => a + i.cantidad, 0)

  const confirmar = async () => {
    const items = Object.entries(carrito).map(([id, i]) => ({ producto_id: parseInt(id), cantidad: i.cantidad }))
    const r = await fetch(`${API_URL}/api/para-llevar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, metodo_pago: metodo })
    })
    const data = await r.json()
    setTicket({ ...data, carritoItems: Object.values(carrito), metodo })
    setVista('ticket')
    setCarrito({})
  }

  const nuevoPedido = () => {
    setTicket(null)
    setVista('productos')
    setMetodo('efectivo')
  }

  if (vista === 'ticket' && ticket) return (
    <Ticket
      subtitulo={`Para Llevar #${ticket.id}`}
      items={ticket.carritoItems.map(i => ({nombre: i.nombre, cantidad: i.cantidad, precio_unitario: i.precio}))}
      total={ticket.total}
      metodo={ticket.metodo}
      onDone={nuevoPedido}
      doneLabel="✅ Nuevo Pedido"
    />
  )

  if (vista === 'carrito') return (
    <div className="min-h-screen bg-transparent p-6">
      <button onClick={() => setVista('productos')} className="mb-6 bg-gray-600 text-white font-bold py-2 px-4 rounded">← Volver</button>
      <h1 className="text-3xl font-bold text-blue-700 mb-6">🛍️ Carrito</h1>
      <div className="bg-white rounded-2xl p-6 mb-6">
        {Object.entries(carrito).map(([id, i]) => (
          <div key={id} className="flex justify-between items-center mb-4 p-4 bg-blue-50 rounded-xl">
            <div>
              <p className="font-bold">{i.icono} {i.nombre}</p>
              <p className="text-sm text-gray-500">${i.precio} c/u</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => changeQty(parseInt(id), -1)} className="w-8 h-8 bg-red-500 text-white rounded-full font-bold">-</button>
              <span className="font-bold text-lg w-6 text-center">{i.cantidad}</span>
              <button onClick={() => changeQty(parseInt(id), 1)} className="w-8 h-8 bg-green-500 text-white rounded-full font-bold">+</button>
              <p className="font-bold w-20 text-right">${(i.precio * i.cantidad).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-blue-600 text-white rounded-2xl p-6 mb-6">
        <p className="text-4xl font-bold text-center">TOTAL: ${totalCarrito.toFixed(2)}</p>
      </div>
      <div className="bg-white rounded-2xl p-6 mb-6">
        <h3 className="font-bold mb-4">Método de Pago</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setMetodo('efectivo')} className={`p-4 rounded-xl border-4 ${metodo === 'efectivo' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 border-gray-200'}`}>
            <div className="text-4xl mb-1">💵</div><p className="font-bold">EFECTIVO</p>
          </button>
          <button onClick={() => setMetodo('tarjeta')} className={`p-4 rounded-xl border-4 ${metodo === 'tarjeta' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-200'}`}>
            <div className="text-4xl mb-1">💳</div><p className="font-bold">TARJETA</p>
          </button>
        </div>
      </div>
      <button onClick={confirmar} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-xl">✅ Confirmar Pedido</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="flex gap-4 mb-8">
        <button onClick={() => { setTab('pedido'); setVista('productos') }} className={`py-2 px-6 rounded-xl font-bold ${tab === 'pedido' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>🛍️ Nuevo Pedido</button>
        <button onClick={() => setTab('historial')} className={`py-2 px-6 rounded-xl font-bold ${tab === 'historial' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>📋 Historial</button>
      </div>

      {tab === 'pedido' && (
        <>
          <div className="flex gap-3 mb-6 flex-wrap">
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)} className={`py-2 px-4 rounded-lg font-bold ${cat === c ? 'bg-blue-600 text-white' : 'bg-white border'}`}>{c}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-32">
            {prods.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} className="bg-white rounded-2xl p-6 hover:shadow-lg relative">
                {carrito[p.id] && (
                  <span className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-7 h-7 text-sm font-bold flex items-center justify-center">
                    {carrito[p.id].cantidad}
                  </span>
                )}
                <div className="text-6xl mb-4">{p.icono || '🍽️'}</div>
                <h3 className="font-bold mb-2">{p.nombre}</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">${p.precio}</p>
                <div className="bg-blue-500 text-white py-2 rounded font-bold">Agregar</div>
              </button>
            ))}
          </div>
          {countCarrito > 0 && (
            <div className="fixed bottom-8 right-8 z-50">
              <button onClick={() => setVista('carrito')} className="bg-blue-600 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl text-lg">
                🛒 Carrito ({countCarrito}) — ${totalCarrito.toFixed(2)}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'historial' && (
        <>
          <div className="flex items-center gap-4 mb-8 bg-white rounded-xl p-4">
            <label className="font-bold text-gray-700">Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="border rounded-lg px-4 py-2 font-bold"
            />
            <button onClick={loadHistorial} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Buscar</button>
          </div>
          {historial.length === 0 ? (
            <div className="text-center text-gray-400 mt-16">
              <p className="text-6xl mb-4">📭</p>
              <p className="text-xl">Sin pedidos para esta fecha</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-gray-700">{historial.length} pedidos</span>
                <span className="font-bold text-green-600 text-xl">Total del día: ${historial.reduce((a, o) => a + o.total, 0).toFixed(2)}</span>
              </div>
              {historial.map(o => (
                <div key={o.id} className="bg-white rounded-2xl p-6">
                  <div className="flex justify-between mb-4">
                    <div>
                      <p className="font-bold text-lg">Pedido #{o.id}</p>
                      <p className="text-sm text-gray-500">{new Date(o.fecha_hora).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-green-600">${o.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{o.metodo_pago === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-1">
                    {o.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{i.producto_nombre} x{i.cantidad}</span>
                        <span className="font-bold">${i.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
