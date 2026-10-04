import React, { useState } from 'react'
import { API_URL } from '../config'
import AgregarPedido from './AgregarPedido'
import Ticket from './Ticket'
import PasosPago, { extrasDePago, ConfirmarCobro } from './PasosPago'
import PinPad from './PinPad'
import Confirmar from './Confirmar'
import Cargando from './Cargando'
import Cuenta from './Cuenta'
import Icono from './Icono'
import { Pantalla, Encabezado, TarjetaLugar, ResumenOcupacion, BotonBorrar, fmt } from './ui'
import usePolling from '../usePolling'
import { avisar, errorDeRespuesta } from '../avisos'

export default function Barras() {
  const [barras, setBarras] = useState(null)
  const [vista, setVista] = useState('grid')
  const [barra, setBarra] = useState(null)
  const [comensales, setComensales] = useState(null)
  const [comensal, setComensal] = useState(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [resumen, setResumen] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [errorCobro, setErrorCobro] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [pinAccion, setPinAccion] = useState(null)   // función pendiente de autorizar con código
  const [porEliminar, setPorEliminar] = useState(null)   // comensal pendiente de confirmar
  const [eliminando, setEliminando] = useState(false)

  // Los loaders lanzan si el servidor falla: usePolling lo muestra como
  // "Sin conexión" en vez de tragarse el error.
  const loadBarras = async () => {
    const r = await fetch(`${API_URL}/api/mesas?tipo=barra`)
    if (!r.ok) throw new Error('barras')
    setBarras(await r.json())
  }

  const loadComensales = async (barraId) => {
    const r = await fetch(`${API_URL}/api/comensales/barra/${barraId}`)
    if (!r.ok) throw new Error('comensales')
    setComensales(await r.json())
  }

  const loadResumen = async (comensalId) => {
    const r = await fetch(`${API_URL}/api/pedidos/comensal/${comensalId}`)
    if (!r.ok) throw new Error('pedidos')
    setResumen(await r.json())
  }

  // Cada vista refresca solo lo suyo y todo se pausa con la pantalla bloqueada.
  usePolling(loadBarras, 5000, [], vista === 'grid')
  usePolling(() => loadComensales(barra.id), 3000, [barra?.id], vista === 'barra' && !!barra)
  usePolling(() => loadResumen(comensal.id), 3000, [comensal?.id], vista === 'comensal' && !!comensal)

  const sinConexion = (e, porDefecto) =>
    avisar(e.message === 'Failed to fetch' ? `Sin conexión: ${porDefecto.toLowerCase()}` : e.message || porDefecto, 'error')

  const agregarComensal = async () => {
    if (!nuevoNombre.trim()) return
    setAgregando(true)
    try {
      const r = await fetch(`${API_URL}/api/comensales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barra_id: barra.id, nombre: nuevoNombre.trim() })
      })
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo agregar el comensal'))
      setNuevoNombre('')
      await loadComensales(barra.id)
    } catch (e) {
      sinConexion(e, 'No se agregó el comensal')
    } finally {
      setAgregando(false)
    }
  }

  const eliminarComensal = async () => {
    setEliminando(true)
    try {
      const r = await fetch(`${API_URL}/api/comensales/${porEliminar.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo eliminar el comensal'))
      avisar(`${porEliminar.nombre} eliminado`)
      await loadComensales(barra.id)
    } catch (e) {
      sinConexion(e, 'No se eliminó')
    } finally {
      setEliminando(false)
      setPorEliminar(null)
    }
  }

  const accionPedido = async (fn, error) => {
    try {
      const r = await fn()
      if (!r.ok) throw new Error()
      await loadResumen(comensal.id)
    } catch {
      avisar(error, 'error')
    }
  }

  // Quitar un producto (boton o bajar la cantidad a 0) pide codigo.
  const eliminarPedido = (pedidoId) => {
    setPinAccion(() => () => accionPedido(
      () => fetch(`${API_URL}/api/pedidos/pedido/${pedidoId}`, { method: 'DELETE' }),
      'No se pudo eliminar el producto'))
  }

  const updateQty = (pedidoId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) return eliminarPedido(pedidoId)
    accionPedido(() => fetch(`${API_URL}/api/pedidos/pedido/${pedidoId}?cantidad=${nuevaCantidad}`, { method: 'PUT' }),
                 'No se pudo cambiar la cantidad')
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
    } catch (e) {
      setErrorCobro(e.message)
    } finally {
      setCobrando(false)
    }
  }

  const etiquetaComensal = `Barra ${barra?.displayNum} — ${comensal?.nombre}`

  // COMPROBANTE (venta ya cerrada)
  if (vista === 'ticket' && ticket) return (
    <Ticket
      folio={ticket.folio}
      subtitulo={`Barra ${barra?.displayNum} — ${ticket.nombre}`}
      items={ticket.pedidos.map(p => ({nombre: p.producto, cantidad: p.cantidad, precio_unitario: p.precio_unitario, subtotal: p.subtotal}))}
      total={ticket.total}
      metodo={ticket.metodo_pago}
      extras={extrasDePago(ticket)}
      doneLabel="Listo"
      onDone={() => { setTicket(null); setComensal(null); setResumen(null); setVista('barra') }}
    />
  )

  // 1. CONFIRMAR
  if (vista === 'confirmar' && comensal) return (
    <ConfirmarCobro
      titulo={`¿Generar el cobro de ${comensal.nombre}?`}
      subtitulo={`Barra ${barra?.displayNum}`}
      total={resumen?.total}
      onSi={() => { setErrorCobro(''); setVista('pago') }}
      onNo={() => setVista('comensal')}
      noLabel="Ver cuenta"
    />
  )

  // 2-3. MÉTODO + DATOS DEL PAGO
  if (vista === 'pago' && comensal && resumen) return (
    <PasosPago
      total={resumen.total}
      subtitulo={etiquetaComensal}
      onCobrar={cobrar}
      onCancel={() => setVista('confirmar')}
      error={errorCobro}
      cargando={cobrando}
    />
  )

  // AGREGAR PEDIDO
  if (vista === 'pedidos' && comensal) return (
    <AgregarPedido comensalId={comensal.id} titulo={etiquetaComensal} onBack={() => setVista('comensal')} />
  )

  // CUENTA DEL COMENSAL
  if (vista === 'comensal' && comensal) return (
    <Pantalla>
      <Encabezado
        onBack={() => { setVista('barra'); setComensal(null); setResumen(null) }}
        backLabel={`Barra ${barra?.displayNum}`}
        titulo={comensal.nombre}
        subtitulo={`Barra ${barra?.displayNum}`}
      />
      {!resumen
        ? <div className="bg-white rounded-2xl"><Cargando /></div>
        : <Cuenta
            pedidos={resumen.pedidos} total={resumen.total}
            onQty={updateQty} onDel={eliminarPedido}
            onAdd={() => setVista('pedidos')}
            onPay={() => resumen.pedidos.length && setVista('confirmar')}
          />}

      {pinAccion && (
        <PinPad
          titulo="Código para eliminar producto"
          onConfirm={async () => { const fn = pinAccion; setPinAccion(null); await fn() }}
          onCancel={() => setPinAccion(null)}
        />
      )}
    </Pantalla>
  )

  // BARRA - LISTA DE COMENSALES
  if (vista === 'barra' && barra) return (
    <Pantalla ancho="max-w-4xl">
      <Encabezado
        onBack={() => { setVista('grid'); setBarra(null); setComensales(null) }}
        backLabel="Barras"
        titulo={`Barra ${barra.displayNum}`}
        subtitulo="Cada comensal se cobra por separado"
      />

      <form
        onSubmit={e => { e.preventDefault(); agregarComensal() }}
        className="bg-white rounded-3xl border border-crema-borde p-4 sm:p-5 mb-5 flex flex-col sm:flex-row gap-3"
      >
        <label className="sr-only" htmlFor="nuevo-comensal">Nombre del comensal</label>
        <input
          id="nuevo-comensal"
          type="text"
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          placeholder="Nombre del nuevo comensal"
          maxLength={80}
          className="flex-1 min-w-0 h-14 border border-crema-borde rounded-xl px-4 text-lg"
        />
        <button type="submit" disabled={!nuevoNombre.trim() || agregando} className="h-14 px-6 rounded-xl bg-marca text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          <Icono nombre="mas" grosor={2.2} />{agregando ? 'Agregando…' : 'Agregar comensal'}
        </button>
      </form>

      {comensales === null ? (
        <div className="bg-white rounded-2xl"><Cargando /></div>
      ) : comensales.length === 0 ? (
        <div className="bg-white/90 rounded-3xl text-center text-tinta-suave py-12 px-4">
          <Icono nombre="usuario" className="w-10 h-10 mx-auto mb-2" />
          <p className="text-xl font-bold text-tinta">Sin comensales</p>
          <p>Agrega el nombre de quien se sienta en la barra.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {comensales.map(c => (
            <div key={c.id} className="bg-white rounded-3xl border border-crema-borde p-2 pl-2 flex items-center gap-2">
              <button
                onClick={() => { setComensal(c); setResumen(null); setVista('comensal') }}
                className="flex-1 min-w-0 min-h-[72px] flex items-center gap-3 text-left rounded-2xl px-3 hover:bg-crema/60"
              >
                <span className="w-11 h-11 rounded-full bg-crema text-marca-oscuro flex items-center justify-center shrink-0">
                  <Icono nombre="usuario" className="w-6 h-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-lg truncate">{c.nombre}</span>
                  <span className="block text-sm text-tinta-suave">
                    {c.platillos ? `${c.platillos} platillo${c.platillos !== 1 ? 's' : ''}` : 'Sin platillos'}
                  </span>
                </span>
                {c.platillos > 0 && <span className="text-xl font-bold text-terracota-oscuro shrink-0">${fmt(c.total)}</span>}
              </button>
              <BotonBorrar onClick={() => setPorEliminar(c)} label={`Eliminar a ${c.nombre}`} />
            </div>
          ))}
        </div>
      )}

      {porEliminar && (
        <Confirmar
          peligro
          titulo={`¿Eliminar a ${porEliminar.nombre}?`}
          mensaje="Se borran también sus pedidos sin cobrar."
          confirmarLabel="Sí, eliminar"
          cargando={eliminando}
          onConfirm={eliminarComensal}
          onCancel={() => setPorEliminar(null)}
        />
      )}
    </Pantalla>
  )

  // GRID BARRAS
  return (
    <Pantalla>
      <Encabezado titulo="Barras" subtitulo="Toca una barra para ver sus comensales">
        {barras && <ResumenOcupacion lugares={barras} />}
      </Encabezado>
      {barras === null ? (
        <div className="bg-white rounded-2xl"><Cargando texto="Cargando barras…" /></div>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {/* Numeracion visible por posicion (Barra 1..N), nunca restando 100. */}
          {barras.map((b, idx) => (
            <TarjetaLugar
              key={b.id}
              titulo={`Barra ${idx + 1}`}
              lugar={b}
              detalle={b.comensales ? `${b.comensales} comensal${b.comensales !== 1 ? 'es' : ''}` : null}
              onClick={() => { setBarra({ ...b, displayNum: idx + 1 }); setComensales(null); setVista('barra') }}
            />
          ))}
        </div>
      )}
    </Pantalla>
  )
}
