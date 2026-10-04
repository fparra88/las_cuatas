import React, {useState} from 'react'
import TecladoNumerico from './TecladoNumerico'

// Captura nombre y precio para una sola linea de pedido (producto editable).
// No modifica el catalogo: lo capturado viaja con el pedido.
export default function ProductoLibreModal({producto, onConfirm, onCancel}) {
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')

  const precioNum = parseFloat(precio)
  const valido = nombre.trim() !== '' && !isNaN(precioNum) && precioNum >= 0

  const confirmar = (e) => {
    e.preventDefault()
    if (!valido) return
    onConfirm({nombre_personalizado: nombre.trim(), precio_unitario: precioNum})
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center sm:p-6 z-[60]" onClick={onCancel}>
      <form
        onSubmit={confirmar}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 w-full sm:max-w-md shadow-2xl max-h-[95vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-7"
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl">{producto?.icono || '✏️'}</span>
          <div>
            <h2 className="font-display text-2xl font-bold text-marca-oscuro">Producto libre</h2>
            <p className="text-sm text-tinta-suave">Solo para esta línea; el menú no cambia.</p>
          </div>
        </div>

        <label className="block text-sm font-bold mb-1.5" htmlFor="libre-nombre">Nombre</label>
        <input
          id="libre-nombre"
          autoFocus
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej. Pastel de cumpleaños"
          maxLength={80}
          className="w-full h-14 border border-crema-borde rounded-xl px-4 mb-4 text-lg focus:outline-none focus:border-marca"
        />

        <label className="block text-sm font-bold mb-1.5" htmlFor="libre-precio">Precio</label>
        <input
          id="libre-precio"
          type="text"
          inputMode="decimal"
          value={precio}
          onChange={e => setPrecio(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder="0.00"
          className="w-full h-14 border border-crema-borde rounded-xl px-4 mb-3 text-2xl font-bold text-center focus:outline-none focus:border-marca"
        />
        <div className="mb-5"><TecladoNumerico valor={precio} onChange={setPrecio} /></div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="h-14 rounded-xl border border-crema-borde bg-white font-bold text-marca-oscuro">
            Cancelar
          </button>
          <button type="submit" disabled={!valido} className="h-14 rounded-xl bg-marca text-white font-bold disabled:opacity-50">
            Agregar
          </button>
        </div>
      </form>
    </div>
  )
}
