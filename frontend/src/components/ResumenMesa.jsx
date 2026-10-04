import React, {useState} from 'react'
import {API_URL} from '../config'
import PinPad from './PinPad'
import Cargando from './Cargando'
import Cuenta from './Cuenta'
import {Pantalla, Encabezado} from './ui'
import usePolling from '../usePolling'
import {avisar} from '../avisos'

export default function ResumenMesa({mesaId, num, onAdd, onPay, onBack, etiqueta = 'Mesa'}) {
  const [res, setRes] = useState(null)
  const [pinAccion, setPinAccion] = useState(null)   // función pendiente de autorizar con código

  const reload = async () => {
    const r = await fetch(`${API_URL}/api/pedidos/mesa/${mesaId}`)
    if (!r.ok) throw new Error('pedidos')
    setRes(await r.json())
  }

  usePolling(reload, 3000, [mesaId])

  // Las acciones avisan si fallan: antes un error de red no decia nada y el
  // mesero creia que el cambio se habia guardado.
  const accion = async (fn, error) => {
    try {
      const r = await fn()
      if (!r.ok) throw new Error()
      await reload()
    } catch {
      avisar(error, 'error')
    }
  }

  // Eliminar un producto del pedido pide codigo, sea por el boton de basura o
  // bajando la cantidad hasta 0.
  const del = (id) => {
    setPinAccion(() => () => accion(
      () => fetch(`${API_URL}/api/pedidos/pedido/${id}`, {method: 'DELETE'}),
      'No se pudo eliminar el producto'))
  }

  const updateQty = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      del(id)
      return
    }
    accion(() => fetch(`${API_URL}/api/pedidos/pedido/${id}?cantidad=${nuevaCantidad}`, {method: 'PUT'}),
           'No se pudo cambiar la cantidad')
  }

  return (
    <Pantalla>
      <Encabezado onBack={onBack} backLabel="Mesas" titulo={`${etiqueta} ${num}`} />
      {!res
        ? <div className="bg-white rounded-2xl"><Cargando /></div>
        : <Cuenta pedidos={res.pedidos} total={res.total} onQty={updateQty} onDel={del} onAdd={onAdd} onPay={onPay} />}

      {pinAccion && (
        <PinPad
          titulo="Código para eliminar producto"
          onConfirm={async () => { const fn = pinAccion; setPinAccion(null); await fn() }}
          onCancel={() => setPinAccion(null)}
        />
      )}
    </Pantalla>
  )
}
