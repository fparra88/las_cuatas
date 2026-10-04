import React, {useEffect, useMemo, useState} from 'react'
import {API_URL} from '../config'
import ProductoLibreModal from './ProductoLibreModal'
import Cargando from './Cargando'
import Icono from './Icono'
import {Pantalla, Encabezado, fmt} from './ui'
import {normalizar} from '../texto'
import {avisar, errorDeRespuesta} from '../avisos'

// Orden e icono por categoria. Las no listadas se muestran al final.
export const CAT_META = {
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
  'Otros': '✏️',
}
const CAT_ORDER = Object.keys(CAT_META)

// Ordena segun CAT_ORDER; desconocidas alfabeticas al final.
export function ordenarCategorias(cats) {
  return [...cats].sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a)
    const ib = CAT_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

// Fila de categorias con scroll horizontal: en telefono 20+ categorias en
// varias filas empujaban los productos fuera de la pantalla.
export function FilaCategorias({cats, cat, onCat, deshabilitada}) {
  return (
    <div className={`mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] ${deshabilitada ? 'opacity-40 pointer-events-none' : ''}`}>
      {cats.map(c => (
        <button
          key={c}
          onClick={() => onCat(c)}
          className={`shrink-0 h-11 flex items-center gap-2 px-4 rounded-full text-sm font-bold transition-colors ${
            cat === c ? 'bg-marca text-white' : 'bg-white text-tinta border border-crema-borde'
          }`}
        >
          <span className="text-base leading-none">{CAT_META[c] || '🍽️'}</span>
          {c}
        </button>
      ))}
    </div>
  )
}

// Buscador grande con boton para limpiar.
export function Buscador({valor, onChange, placeholder = 'Buscar en todo el menú…'}) {
  return (
    <label className="flex items-center gap-2.5 h-14 bg-white border border-crema-borde rounded-2xl px-4 text-tinta-suave shadow-sm">
      <Icono nombre="buscar" className="w-6 h-6" />
      <input
        type="text"
        value={valor}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 outline-none text-lg text-tinta bg-transparent"
      />
      {valor && (
        <button type="button" onClick={() => onChange('')} aria-label="Limpiar búsqueda" className="w-10 h-10 rounded-lg flex items-center justify-center">
          <Icono nombre="cerrar" />
        </button>
      )}
    </label>
  )
}

// Tarjeta de producto del menu. badge: numero a mostrar arriba a la derecha.
export function TarjetaProducto({producto: p, badge, onClick}) {
  return (
    <button
      onClick={onClick}
      className={`relative min-h-[132px] bg-white rounded-2xl border-2 p-3 sm:p-4 text-left flex flex-col gap-1 active:scale-[.97] transition-transform
        ${badge ? 'border-marca' : 'border-crema-borde'}`}
    >
      {badge ? (
        <span className="absolute top-2 right-2 min-w-7 h-7 px-2 rounded-full bg-marca text-white text-sm font-bold flex items-center justify-center">
          {badge}
        </span>
      ) : null}
      <span className="text-4xl leading-none mb-1">{p.icono || '🍽️'}</span>
      <span className="font-bold leading-snug">{p.nombre}</span>
      <span className="mt-auto text-lg font-bold text-marca-oscuro">{p.editable ? 'Precio libre' : `$${fmt(p.precio)}`}</span>
    </button>
  )
}

// Agrega productos a una mesa (mesaId) o a un comensal de barra (comensalId).
// Antes cada producto regresaba a la cuenta; ahora se queda aqui para agregar
// varios seguidos y "Listo" (onBack) regresa.
export default function AgregarPedido({mesaId, comensalId, titulo, onBack}) {
  const [todosProds, setTodosProds] = useState(null)
  const [cat, setCat] = useState('')
  const [cats, setCats] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [libre, setLibre] = useState(null)   // producto editable pendiente de capturar
  const [agregados, setAgregados] = useState({})   // {producto_id: n} en esta visita

  const sortedCats = useMemo(() => ordenarCategorias(cats), [cats])

  // Se trae el catalogo completo una sola vez: la busqueda cruza todas las
  // categorias sin ir al servidor en cada tecla.
  useEffect(() => {
    const load = async () => {
      try {
        const [rc, rp] = await Promise.all([
          fetch(`${API_URL}/api/productos/categorias`),
          fetch(`${API_URL}/api/productos`),
        ])
        if (!rc.ok || !rp.ok) throw new Error()
        setCats(await rc.json())
        setTodosProds(await rp.json())
      } catch {
        setTodosProds([])
        avisar('No se pudo cargar el menú', 'error')
      }
    }
    load()
  }, [])

  // Selecciona primera categoria una vez ordenadas.
  useEffect(() => {
    if (!cat && sortedCats.length) setCat(sortedCats[0])
  }, [sortedCats, cat])

  const prods = useMemo(() => {
    const lista = todosProds || []
    const q = normalizar(busqueda.trim())
    if (q) return lista.filter(p => normalizar(p.nombre).includes(q))
    return lista.filter(p => p.categoria === cat)
  }, [todosProds, busqueda, cat])

  const add = async (p, extra = {}) => {
    const base = comensalId
      ? {comensal_id: comensalId, producto_id: p.id, cantidad: 1}
      : {mesa_id: mesaId, producto_id: p.id, cantidad: 1}
    try {
      const r = await fetch(`${API_URL}/api/pedidos`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...base, ...extra})})
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo agregar'))
      setAgregados(a => ({...a, [p.id]: (a[p.id] || 0) + 1}))
      avisar(`Agregado: ${extra.nombre_personalizado || p.nombre}`)
    } catch (e) {
      avisar(e.message === 'Failed to fetch' ? `Sin conexión: no se agregó ${p.nombre}` : e.message, 'error')
    }
  }

  // Producto editable: primero se captura nombre y precio de esa linea.
  const seleccionar = (p) => {
    if (p.editable) setLibre(p)
    else add(p)
  }

  const totalAgregados = Object.values(agregados).reduce((a, n) => a + n, 0)

  return (
    <Pantalla ancho="max-w-7xl">
      <Encabezado onBack={onBack} backLabel="Cuenta" titulo="Agregar platillos" subtitulo={titulo} />

      {/* Buscador y categorias fijos arriba al hacer scroll */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-3 px-4 sm:px-3 pt-2 pb-3 mb-3 bg-white/75 backdrop-blur rounded-b-2xl">
        <Buscador valor={busqueda} onChange={setBusqueda} />
        <FilaCategorias cats={sortedCats} cat={cat} onCat={setCat} deshabilitada={!!busqueda.trim()} />
      </div>

      {todosProds === null ? (
        <div className="bg-white rounded-2xl"><Cargando texto="Cargando menú…" /></div>
      ) : (
        <>
          {busqueda.trim() && prods.length === 0 && (
            <p className="bg-white/90 rounded-2xl text-center text-tinta-suave py-8">Sin resultados para "{busqueda}".</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-28">
            {prods.map(p => (
              <TarjetaProducto key={p.id} producto={p} badge={agregados[p.id] ? `+${agregados[p.id]}` : null} onClick={() => seleccionar(p)} />
            ))}
          </div>
        </>
      )}

      {/* Barra "Listo": sobre la navegacion inferior en telefono */}
      <div className="fixed z-30 bottom-20 sm:bottom-5 inset-x-3 sm:inset-x-auto sm:right-6 lg:right-8 flex justify-end pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto h-16 px-6 rounded-2xl bg-terracota text-white text-lg font-bold shadow-2xl flex items-center gap-3 w-full sm:w-auto justify-center"
        >
          <Icono nombre="check" className="w-6 h-6" grosor={2.2} />
          {totalAgregados ? `Listo · ${totalAgregados} agregado${totalAgregados !== 1 ? 's' : ''}` : 'Volver a la cuenta'}
        </button>
      </div>

      {libre && (
        <ProductoLibreModal
          producto={libre}
          onCancel={() => setLibre(null)}
          onConfirm={async (datos) => {
            const p = libre
            setLibre(null)
            await add(p, datos)
          }}
        />
      )}
    </Pantalla>
  )
}
