import React from 'react'
import Icono from './Icono'
import { Stepper, BotonBorrar, fmt } from './ui'

// Cuenta abierta: lineas del pedido + panel con total, Agregar y Cobrar.
// Compartida por la mesa (ResumenMesa) y el comensal de barra (Barras).
// Solo presentacion: el padre hace los fetch y pide el PIN.
//   pedidos -> [{id, producto_nombre, precio_unitario, cantidad}]
export default function Cuenta({ pedidos, total, onQty, onDel, onAdd, onPay }) {
  const piezas = pedidos.reduce((a, p) => a + p.cantidad, 0)
  const vacio = pedidos.length === 0

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
      <section className="flex-1 min-w-0 bg-white rounded-3xl border border-crema-borde px-4 sm:px-6 py-1">
        {vacio ? (
          <div className="py-12 text-center text-tinta-suave">
            <p className="text-lg font-bold text-tinta">Sin platillos todavía</p>
            <p className="mb-5">Agrega lo que se pidió.</p>
            <button onClick={onAdd} className="h-14 px-6 rounded-2xl bg-marca text-white font-bold inline-flex items-center gap-2">
              <Icono nombre="mas" grosor={2.2} />Agregar platillos
            </button>
          </div>
        ) : pedidos.map(p => (
          <div key={p.id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 sm:gap-4 py-4 border-b border-crema-linea last:border-0">
            <div className="flex-1 min-w-[60%] sm:min-w-0">
              <p className="text-base sm:text-lg font-bold">{p.producto_nombre}</p>
              <p className="text-sm text-tinta-suave">${fmt(p.precio_unitario)} c/u</p>
            </div>
            <p className="sm:order-last text-lg font-bold sm:w-24 text-right">${fmt(p.cantidad * p.precio_unitario)}</p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <Stepper cantidad={p.cantidad} onMenos={() => onQty(p.id, p.cantidad - 1)} onMas={() => onQty(p.id, p.cantidad + 1)} />
              <BotonBorrar onClick={() => onDel(p.id)} label={`Eliminar ${p.producto_nombre} (pide código)`} />
            </div>
          </div>
        ))}
      </section>

      {/* En telefono el panel queda abajo; en lg es la columna derecha fija. */}
      <aside className="lg:w-[340px] shrink-0 flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
        <div className="bg-white rounded-3xl border border-crema-borde p-5 sm:p-6 flex lg:block items-end justify-between gap-3">
          <div>
            <p className="text-sm text-tinta-suave">Total de la cuenta</p>
            <p className="text-4xl sm:text-5xl font-bold text-marca-oscuro leading-tight">${fmt(total)}</p>
          </div>
          <p className="text-sm text-tinta-suave">{piezas} platillo{piezas !== 1 ? 's' : ''}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <button onClick={onAdd} className="h-16 rounded-2xl bg-marca text-white text-lg sm:text-xl font-bold flex items-center justify-center gap-2">
            <Icono nombre="mas" className="w-6 h-6" grosor={2} />Agregar
          </button>
          <button
            onClick={onPay} disabled={vacio}
            className="h-16 lg:h-[72px] rounded-2xl bg-terracota text-white text-lg sm:text-2xl font-bold disabled:bg-crema-borde disabled:text-tinta-suave"
          >Cobrar</button>
        </div>
      </aside>
    </div>
  )
}
