import React, {useEffect, useMemo, useState} from 'react'
import {API_URL} from '../config'

// Orden e icono por categoria. Las no listadas se muestran al final.
const CAT_META = {
  'Desayunos': '🍳',
  'Comida Corrida': '🍽️',
  'Guisados': '🍲',
  'Arroz': '🍚',
  'Frijol': '🫘',
  'Verduras': '🥦',
  'Platillos': '🍝',
  'Carne Asada': '🥩',
  'Parrillada': '🔥',
  'Alambre': '🍢',
  'Pollo': '🍗',
  'Pollo Vegetariano': '🥗',
  'Milanesa': '🍖',
  'Chamorro': '🍖',
  'Menudo': '🍜',
  'Ensaladas': '🥗',
  'Lonches': '🥖',
  'Tortas': '🥙',
  'Tacos': '🌮',
  'Quesadillas': '🫓',
  'Hamburguesas': '🍔',
  'Bebidas': '🥤',
}
const CAT_ORDER = Object.keys(CAT_META)

export default function AgregarPedido({mesaId, comensalId, onBack, onAdd}) {
  const [prods, setProds] = useState([])
  const [cat, setCat] = useState('')
  const [cats, setCats] = useState([])

  // Ordena segun CAT_ORDER; desconocidas alfabeticas al final.
  const sortedCats = useMemo(() => {
    return [...cats].sort((a, b) => {
      const ia = CAT_ORDER.indexOf(a)
      const ib = CAT_ORDER.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  }, [cats])

  useEffect(() => {
    const load = async () => {
      const r = await fetch(`${API_URL}/api/productos/categorias`)
      const c = await r.json()
      setCats(c)
    }
    load()
  }, [])

  // Selecciona primera categoria una vez ordenadas.
  useEffect(() => {
    if (!cat && sortedCats.length) setCat(sortedCats[0])
  }, [sortedCats, cat])

  useEffect(() => {
    if(!cat) return
    const load = async () => {
      const r = await fetch(`${API_URL}/api/productos?categoria=${cat}`)
      setProds(await r.json())
    }
    load()
  }, [cat])

  const add = async (id) => {
    const body = comensalId
      ? {comensal_id: comensalId, producto_id: id, cantidad: 1}
      : {mesa_id: mesaId, producto_id: id, cantidad: 1}
    await fetch(`${API_URL}/api/pedidos`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
    onAdd()
  }

  return (
    <div className="min-h-screen bg-transparent p-6">
      <button onClick={onBack} className="mb-8 bg-gray-600 text-white font-bold py-2 px-4 rounded">← Volver</button>
      <div className="flex flex-wrap gap-2 mb-8">
        {sortedCats.map(c => {
          const activo = cat === c
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`flex items-center gap-2 py-2 px-4 rounded-full font-semibold text-sm transition-all ${
                activo
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              <span className="text-base leading-none">{CAT_META[c] || '🍽️'}</span>
              {c}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {prods.map(p => (
          <button key={p.id} onClick={() => add(p.id)} className="bg-white rounded-2xl p-6 hover:shadow-lg">
            <div className="text-6xl mb-4">{p.icono || '🍽️'}</div>
            <h3 className="font-bold mb-2">{p.nombre}</h3>
            <p className="text-2xl font-bold text-blue-600 mb-4">${p.precio}</p>
            <div className="bg-blue-500 text-white py-2 rounded font-bold">Agregar</div>
          </button>
        ))}
      </div>
    </div>
  )
}
