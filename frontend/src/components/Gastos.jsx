import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import { hoyLocal, horaLocal } from '../fecha'

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [fecha, setFecha] = useState(hoyLocal())
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')

  const load = async () => {
    const r = await fetch(`${API_URL}/api/gastos?fecha=${fecha}`)
    setGastos(await r.json())
  }

  useEffect(() => { load() }, [fecha])

  const agregar = async () => {
    if (!descripcion.trim() || !monto || parseFloat(monto) <= 0) return
    await fetch(`${API_URL}/api/gastos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descripcion: descripcion.trim(), monto: parseFloat(monto) })
    })
    setDescripcion('')
    setMonto('')
    load()
  }

  const eliminar = async (id) => {
    if (confirm('¿Eliminar gasto?')) {
      await fetch(`${API_URL}/api/gastos/${id}`, { method: 'DELETE' })
      load()
    }
  }

  const total = gastos.reduce((a, g) => a + g.monto, 0)

  return (
    <div className="min-h-screen bg-transparent p-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-red-700 mb-8">💸 Gastos</h2>

        {/* Formulario nuevo gasto */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-xl mb-4">Registrar Gasto</h3>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción del gasto..."
              className="border rounded-xl px-4 py-3 text-lg"
            />
            <div className="flex gap-3">
              <input
                type="number"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregar()}
                placeholder="Monto $"
                min="0"
                step="0.01"
                className="flex-1 border rounded-xl px-4 py-3 text-lg"
              />
              <button onClick={agregar} className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl">+ Agregar</button>
            </div>
          </div>
        </div>

        {/* Filtro fecha */}
        <div className="bg-white rounded-xl p-4 mb-6 flex items-center gap-4">
          <label className="font-bold text-gray-700">Fecha:</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border rounded-lg px-4 py-2 font-bold"
          />
          <button onClick={load} className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold">↻</button>
        </div>

        {/* Lista gastos */}
        {gastos.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-xl">Sin gastos registrados</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {gastos.map(g => (
                <div key={g.id} className="bg-white rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{g.descripcion}</p>
                    <p className="text-sm text-gray-500">{horaLocal(g.fecha_hora)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-red-600 text-xl">${g.monto.toFixed(2)}</p>
                    <button onClick={() => eliminar(g.id)} className="text-red-400 hover:text-red-600 text-xl">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-red-600 text-white rounded-2xl p-6 text-center">
              <p className="text-sm mb-1 opacity-80">TOTAL GASTOS DEL DÍA</p>
              <p className="text-4xl font-bold">${total.toFixed(2)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
