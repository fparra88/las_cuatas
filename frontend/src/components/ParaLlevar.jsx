import React, { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../config'
import Ticket from './Ticket'
import ProductoLibreModal from './ProductoLibreModal'
import PasosPago, { extrasDePago, ConfirmarCobro } from './PasosPago'
import PinPad from './PinPad'
import Icono from './Icono'
import Cargando from './Cargando'
import { ordenarCategorias, FilaCategorias, Buscador, TarjetaProducto } from './AgregarPedido'
import { Pantalla, Encabezado, Stepper, fmt } from './ui'
import { hoyLocal, horaLocal } from '../fecha'
import { normalizar } from '../texto'
import { avisar } from '../avisos'

export default function ParaLlevar() {
  const [tab, setTab] = useState('pedido')
  const [todosProds, setTodosProds] = useState(null)
  const [cats, setCats] = useState([])
  const [cat, setCat] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState({})
  const [vista, setVista] = useState('productos')
  const [ticket, setTicket] = useState(null)
  const [fecha, setFecha] = useState(hoyLocal())
  const [historial, setHistorial] = useState(null)
  const [libre, setLibre] = useState(null)   // producto editable pendiente de capturar
  const [errorCobro, setErrorCobro] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [pinAccion, setPinAccion] = useState(null)   // función pendiente de autorizar con código

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
        const c = ordenarCategorias(await rc.json())
        setCats(c)
        if (c.length) setCat(c[0])
        setTodosProds(await rp.json())
      } catch {
        setTodosProds([])
        avisar('No se pudo cargar el menú', 'error')
      }
    }
    load()
  }, [])

  const prods = useMemo(() => {
    const lista = todosProds || []
    const q = normalizar(busqueda.trim())
    if (q) return lista.filter(p => normalizar(p.nombre).includes(q))
    return lista.filter(p => p.categoria === cat)
  }, [todosProds, busqueda, cat])

  useEffect(() => {
    if (tab !== 'historial') return
    setHistorial(null)
    loadHistorial()
  }, [tab, fecha])

  const loadHistorial = async () => {
    try {
      const r = await fetch(`${API_URL}/api/para-llevar?fecha=${fecha}`)
      if (!r.ok) throw new Error()
      setHistorial(await r.json())
    } catch {
      setHistorial(h => h || [])
      avisar('No se pudo cargar el historial', 'error')
    }
  }

  const addToCart = (p) => {
    setCarrito(prev => ({
      ...prev,
      [p.id]: prev[p.id]
        ? { ...prev[p.id], cantidad: prev[p.id].cantidad + 1 }
        : { producto_id: p.id, nombre: p.nombre, precio: p.precio, icono: p.icono || '🍽️', cantidad: 1 }
    }))
  }

  // Cada producto libre es una linea propia: si se agruparan bajo el id del
  // catalogo, dos items con nombre/precio distintos se fusionarian.
  const addLibreToCart = (p, {nombre_personalizado, precio_unitario}) => {
    const clave = `libre-${p.id}-${Date.now()}`
    setCarrito(prev => ({
      ...prev,
      [clave]: {
        producto_id: p.id,
        nombre: nombre_personalizado,
        precio: precio_unitario,
        icono: p.icono || '✏️',
        cantidad: 1,
        libre: true,
      }
    }))
  }

  const seleccionar = (p) => {
    if (p.editable) setLibre(p)
    else addToCart(p)
  }

  // Bajar la cantidad hasta 0 quita el producto del carrito: pide codigo.
  const changeQty = (id, delta) => {
    const nueva = (carrito[id]?.cantidad || 0) + delta
    if (nueva <= 0) {
      setPinAccion(() => () => {
        setCarrito(prev => { const next = { ...prev }; delete next[id]; return next })
      })
      return
    }
    setCarrito(prev => ({ ...prev, [id]: { ...prev[id], cantidad: nueva } }))
  }

  const totalCarrito = Object.values(carrito).reduce((a, i) => a + i.precio * i.cantidad, 0)
  const countCarrito = Object.values(carrito).reduce((a, i) => a + i.cantidad, 0)

  // La orden se crea hasta cerrar el pago; la cuenta previa solo se imprime.
  const confirmar = async (pago) => {
    setCobrando(true)
    setErrorCobro('')
    const items = Object.values(carrito).map(i => (
      i.libre
        ? { producto_id: i.producto_id, cantidad: i.cantidad, nombre_personalizado: i.nombre, precio_unitario: i.precio }
        : { producto_id: i.producto_id, cantidad: i.cantidad }
    ))
    try {
      const r = await fetch(`${API_URL}/api/para-llevar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, ...pago })
      })
      const data = await r.json()
      if (!r.ok) {
        const d = data.detail
        throw new Error(Array.isArray(d) ? d[0]?.msg || 'Datos inválidos' : d || 'No se pudo cobrar')
      }
      setTicket({ ...data, carritoItems: Object.values(carrito) })
      setVista('ticket')
      setCarrito({})
    } catch (e) {
      setErrorCobro(e.message)
    } finally {
      setCobrando(false)
    }
  }

  const nuevoPedido = () => {
    setTicket(null)
    setVista('productos')
    setErrorCobro('')
  }

  const pinPad = pinAccion && (
    <PinPad
      titulo="Código para quitar producto"
      onConfirm={() => { const fn = pinAccion; setPinAccion(null); fn() }}
      onCancel={() => setPinAccion(null)}
    />
  )

  // Lineas del carrito: se usan en la vista Carrito (telefono/tablet vertical)
  // y en el panel lateral (pantallas anchas).
  const lineasCarrito = Object.entries(carrito).map(([id, i]) => (
    <div key={id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 border-b border-crema-linea last:border-0">
      <div className="flex-1 min-w-[55%]">
        <p className="font-bold leading-snug">{i.icono} {i.nombre}</p>
        <p className="text-sm text-tinta-suave">${fmt(i.precio)} c/u</p>
      </div>
      <p className="font-bold">${fmt(i.precio * i.cantidad)}</p>
      <Stepper cantidad={i.cantidad} onMenos={() => changeQty(id, -1)} onMas={() => changeQty(id, 1)} />
    </div>
  ))

  const botonCobrar = (
    <button
      onClick={() => countCarrito && setVista('confirmar')}
      disabled={!countCarrito}
      className="w-full h-16 rounded-2xl bg-terracota text-white text-xl font-bold disabled:bg-crema-borde disabled:text-tinta-suave"
    >Cobrar ${fmt(totalCarrito)}</button>
  )

  // COMPROBANTE (orden ya creada)
  if (vista === 'ticket' && ticket) return (
    <Ticket
      folio={ticket.folio}
      subtitulo="Para Llevar"
      items={ticket.carritoItems.map(i => ({nombre: i.nombre, cantidad: i.cantidad, precio_unitario: i.precio}))}
      total={ticket.total}
      metodo={ticket.metodo_pago}
      extras={extrasDePago(ticket)}
      onDone={nuevoPedido}
      doneLabel="Nuevo pedido"
    />
  )

  // 1. CONFIRMAR
  if (vista === 'confirmar') return (
    <ConfirmarCobro
      titulo="¿Generar el cobro del pedido para llevar?"
      subtitulo={`${countCarrito} artículo${countCarrito !== 1 ? 's' : ''}`}
      total={totalCarrito}
      onSi={() => { setErrorCobro(''); setVista('pago') }}
      onNo={() => setVista('carrito')}
      noLabel="Volver al carrito"
    />
  )

  // 2-3. MÉTODO + DATOS DEL PAGO
  if (vista === 'pago') return (
    <PasosPago
      total={totalCarrito}
      subtitulo="Para Llevar"
      onCobrar={confirmar}
      onCancel={() => setVista('confirmar')}
      error={errorCobro}
      cargando={cobrando}
    />
  )

  if (vista === 'carrito') return (
    <Pantalla ancho="max-w-3xl">
      <Encabezado onBack={() => setVista('productos')} backLabel="Menú" titulo="Carrito" subtitulo="Para llevar" />
      <div className="bg-white rounded-3xl border border-crema-borde px-4 sm:px-6 py-1 mb-4">
        {countCarrito ? lineasCarrito : <p className="py-10 text-center text-tinta-suave">El carrito está vacío.</p>}
      </div>
      <div className="bg-white rounded-3xl border border-crema-borde p-5 mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-tinta-suave">Total</p>
          <p className="text-4xl font-bold text-marca-oscuro">${fmt(totalCarrito)}</p>
        </div>
        <p className="text-sm text-tinta-suave">{countCarrito} artículo{countCarrito !== 1 ? 's' : ''}</p>
      </div>
      {botonCobrar}
      {pinPad}
    </Pantalla>
  )

  const pestaña = (activa) => `h-12 px-5 rounded-xl font-bold flex items-center gap-2 ${activa ? 'bg-marca text-white' : 'bg-white border border-crema-borde text-marca-oscuro'}`
  const historialVivo = (historial || []).filter(o => !o.cancelado)
  const historialCancelados = (historial || []).filter(o => o.cancelado)

  return (
    <Pantalla ancho="max-w-7xl">
      <Encabezado titulo="Para llevar">
        <button onClick={() => { setTab('pedido'); setVista('productos') }} className={pestaña(tab === 'pedido')}>
          <Icono nombre="llevar" />Nuevo pedido
        </button>
        <button onClick={() => setTab('historial')} className={pestaña(tab === 'historial')}>
          <Icono nombre="ticket" />Historial
        </button>
      </Encabezado>

      {tab === 'pedido' && (
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0">
            <div className="sticky top-0 z-20 -mx-4 sm:-mx-3 px-4 sm:px-3 pt-2 pb-3 mb-3 bg-white/75 backdrop-blur rounded-b-2xl">
              <Buscador valor={busqueda} onChange={setBusqueda} />
              <FilaCategorias cats={cats} cat={cat} onCat={setCat} deshabilitada={!!busqueda.trim()} />
            </div>
            {todosProds === null ? (
              <div className="bg-white rounded-2xl"><Cargando texto="Cargando menú…" /></div>
            ) : (
              <>
                {busqueda.trim() && prods.length === 0 && (
                  <p className="bg-white/90 rounded-2xl text-center text-tinta-suave py-8">Sin resultados para "{busqueda}".</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-28 xl:pb-6">
                  {prods.map(p => (
                    <TarjetaProducto key={p.id} producto={p} badge={carrito[p.id]?.cantidad} onClick={() => seleccionar(p)} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pantallas anchas: carrito siempre visible a la derecha */}
          <aside className="hidden xl:flex w-[360px] shrink-0 sticky top-6 flex-col gap-3 max-h-[calc(100vh-3rem)]">
            <div className="bg-white rounded-3xl border border-crema-borde px-5 py-2 overflow-y-auto min-h-0">
              <p className="font-display text-xl font-bold text-marca-oscuro pt-2 pb-1">Carrito</p>
              {countCarrito ? lineasCarrito : <p className="py-8 text-center text-tinta-suave">Toca un producto para agregarlo.</p>}
            </div>
            <div className="bg-white rounded-3xl border border-crema-borde p-5 flex items-end justify-between">
              <p className="text-4xl font-bold text-marca-oscuro">${fmt(totalCarrito)}</p>
              <p className="text-sm text-tinta-suave">{countCarrito} artículo{countCarrito !== 1 ? 's' : ''}</p>
            </div>
            {botonCobrar}
          </aside>

          {/* Pantallas angostas: boton flotante al carrito (sobre la barra inferior en telefono) */}
          {countCarrito > 0 && (
            <div className="xl:hidden fixed z-30 bottom-20 sm:bottom-5 inset-x-3 sm:inset-x-auto sm:right-6 flex justify-end">
              <button onClick={() => setVista('carrito')} className="w-full sm:w-auto h-16 px-6 rounded-2xl bg-terracota text-white text-lg font-bold shadow-2xl flex items-center justify-center gap-3">
                <Icono nombre="llevar" className="w-6 h-6" />
                Carrito ({countCarrito}) · ${fmt(totalCarrito)}
              </button>
            </div>
          )}

          {libre && (
            <ProductoLibreModal
              producto={libre}
              onCancel={() => setLibre(null)}
              onConfirm={(datos) => { addLibreToCart(libre, datos); setLibre(null) }}
            />
          )}
          {pinPad}
        </div>
      )}

      {tab === 'historial' && (
        <div className="max-w-3xl">
          <div className="bg-white rounded-2xl border border-crema-borde p-3 mb-4 flex items-center gap-3">
            <label htmlFor="fecha-llevar" className="font-bold pl-2">Fecha</label>
            <input
              id="fecha-llevar"
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="h-12 border border-crema-borde rounded-xl px-4 font-medium flex-1 min-w-0"
            />
            <button onClick={loadHistorial} aria-label="Recargar" className="w-12 h-12 shrink-0 rounded-xl bg-marca text-white flex items-center justify-center">
              <Icono nombre="recargar" className="w-6 h-6" />
            </button>
          </div>

          {historial === null ? (
            <div className="bg-white rounded-2xl"><Cargando /></div>
          ) : historial.length === 0 ? (
            <div className="bg-white/90 rounded-3xl text-center text-tinta-suave py-12">
              <p className="text-xl font-bold text-tinta">Sin pedidos para esta fecha</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-marca-oscuro text-white rounded-3xl p-5 flex justify-between items-end flex-wrap gap-2">
                <div>
                  <p className="text-sm opacity-80">
                    {historialVivo.length} pedido{historialVivo.length !== 1 ? 's' : ''}
                    {historialCancelados.length > 0 && ` · ${historialCancelados.length} cancelado(s), no suman`}
                  </p>
                  {/* Las canceladas no suman, igual que en el corte. */}
                  <p className="text-3xl font-bold">${fmt(historialVivo.reduce((a, o) => a + o.total, 0))}</p>
                </div>
                <p className="text-sm opacity-80">Total del día</p>
              </div>
              {historial.map(o => (
                <div key={o.id} className={`rounded-3xl p-5 border ${o.cancelado ? 'bg-[#FFF7F6] border-cancelado-borde' : 'bg-white border-crema-borde'}`}>
                  <div className="flex justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-bold text-lg ${o.cancelado ? 'text-[#7A6C6A]' : ''}`}>Pedido #{o.id}</p>
                        {o.cancelado && <span className="text-[11px] font-bold tracking-wider text-white bg-cancelado rounded-md px-2 py-0.5">CANCELADO</span>}
                      </div>
                      <p className={`text-sm ${o.cancelado ? 'text-[#8A4B46]' : 'text-tinta-suave'}`}>
                        {horaLocal(o.fecha_hora)} · {o.metodo_pago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                        {o.cancelado && o.motivo_cancelacion ? ` · ${o.motivo_cancelacion}` : ''}
                      </p>
                    </div>
                    <p className={`font-bold text-2xl shrink-0 ${o.cancelado ? 'text-[#8A7A78] line-through' : 'text-marca-oscuro'}`}>${fmt(o.total)}</p>
                  </div>
                  <div className="border-t border-crema-linea pt-3 flex flex-col gap-1">
                    {o.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between gap-3 text-sm">
                        <span>{i.producto_nombre} ×{i.cantidad}</span>
                        <span className="font-bold">${fmt(i.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Pantalla>
  )
}
