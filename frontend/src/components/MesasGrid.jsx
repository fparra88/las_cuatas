import React, {useEffect, useState} from 'react'
import {API_URL} from '../config'
import iconoLibre from '../iconos/libre.png'
import iconoOcupado from '../iconos/ocupado.png'

export default function MesasGrid({onSelect}) {
  const [mesas, setMesas] = useState([])
  useEffect(() => {
    const load = async () => {
      const r = await fetch(`${API_URL}/api/mesas`)
      setMesas(await r.json())
    }
    load()
    const i = setInterval(load, 5000)
    return () => clearInterval(i)
  }, [])

  const mesasVisibles = mesas.slice(0, 6)
  const color = (e) => ({disponible: 'bg-white/40', ocupada: 'bg-red-500/20'}[e] || 'bg-gray-400/40')
  const icon = (e) => ({disponible: iconoLibre, ocupada: iconoOcupado}[e] || iconoLibre)

  return (
    <div className="min-h-screen bg-transparent p-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-orange-700 mb-8">Mesas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {mesasVisibles.map(m => (
            <button key={m.id} onClick={() => onSelect(m)} className={`${color(m.estado)} rounded-2xl border-4 p-8 hover:scale-105`}>
              <div className="mb-4"><img src={icon(m.estado)} alt={m.estado} className="h-16 w-16 mx-auto object-contain" /></div>
              <div className="text-2xl font-bold mb-2">Mesa {m.numero}</div>
              <div className="text-xs uppercase">{m.estado}</div>
            </button>
          ))}
        </div>
        <div className="mt-12 bg-white rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div><p className="text-3xl font-bold text-green-600">{mesasVisibles.filter(m => m.estado === 'disponible').length}</p><p>Disponibles</p></div>
            <div><p className="text-3xl font-bold text-red-600">{mesasVisibles.filter(m => m.estado === 'ocupada').length}</p><p>Ocupadas</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
