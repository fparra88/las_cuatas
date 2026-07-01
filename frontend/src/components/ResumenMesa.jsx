import React, {useEffect, useState} from 'react'
import {API_URL} from '../config'

export default function ResumenMesa({mesaId, num, onAdd, onPay, onBack, etiqueta = 'Mesa'}) {
  const [res, setRes] = useState(null)

  useEffect(() => {
    const load = async () => {
      const r = await fetch(`${API_URL}/api/pedidos/mesa/${mesaId}`)
      setRes(await r.json())
    }
    load()
    const i = setInterval(load, 3000)
    return () => clearInterval(i)
  }, [mesaId])

  const reload = async () => {
    const r = await fetch(`${API_URL}/api/pedidos/mesa/${mesaId}`)
    setRes(await r.json())
  }

  const del = async (id) => {
    if(confirm('¿Eliminar?')) {
      await fetch(`${API_URL}/api/pedidos/pedido/${id}`, {method: 'DELETE'})
      reload()
    }
  }

  const updateQty = async (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      await fetch(`${API_URL}/api/pedidos/pedido/${id}`, {method: 'DELETE'})
    } else {
      await fetch(`${API_URL}/api/pedidos/pedido/${id}?cantidad=${nuevaCantidad}`, {method: 'PUT'})
    }
    reload()
  }

  if(!res) return <div>Cargando...</div>

  return (
    <div className="min-h-screen bg-transparent p-6">
      <button onClick={onBack} className="mb-8 bg-gray-600 text-white font-bold py-2 px-4 rounded">← Volver</button>
      <h1 className="text-4xl font-bold text-purple-700 mb-8">📋 {etiqueta} {num}</h1>
      <div className="bg-white rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6">Pedidos</h2>
        {res.pedidos.map(p => (
          <div key={p.id} className="flex justify-between items-center mb-4 p-4 bg-purple-50 rounded">
            <div className="flex-1">
              <p className="font-bold">{p.producto_nombre}</p>
              <p className="text-sm text-gray-500">${p.precio_unitario} c/u</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => updateQty(p.id, p.cantidad - 1)} className="w-8 h-8 bg-red-500 text-white rounded-full font-bold text-lg leading-none">-</button>
              <span className="font-bold text-lg w-6 text-center">{p.cantidad}</span>
              <button onClick={() => updateQty(p.id, p.cantidad + 1)} className="w-8 h-8 bg-green-500 text-white rounded-full font-bold text-lg leading-none">+</button>
              <p className="font-bold w-20 text-right">${(p.cantidad * p.precio_unitario).toFixed(2)}</p>
              <button onClick={() => del(p.id)} className="text-red-500">❌</button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-purple-600 text-white rounded-2xl p-8 mb-8">
        <p className="text-5xl font-bold">TOTAL: ${res.total.toFixed(2)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button onClick={onAdd} className="bg-blue-500 text-white font-bold py-4 rounded-xl">🛒 Agregar</button>
        <button onClick={onPay} className="bg-green-500 text-white font-bold py-4 rounded-xl">💰 Cobrar</button>
      </div>
    </div>
  )
}
