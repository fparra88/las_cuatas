import React, {useState} from 'react'

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={onCancel}>
      <form
        onSubmit={confirmar}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <p className="text-4xl text-center mb-3">{producto?.icono || '✏️'}</p>
        <h2 className="font-bold text-lg text-gray-800 mb-6 text-center">Producto libre</h2>

        <label className="block text-sm font-semibold text-gray-600 mb-1">Nombre</label>
        <input
          autoFocus
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej. Pastel de cumpleaños"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
        />

        <label className="block text-sm font-semibold text-gray-600 mb-1">Precio</label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          placeholder="0.00"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-blue-500"
        />

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl">
            Cancelar
          </button>
          <button type="submit" disabled={!valido} className="bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
            Agregar
          </button>
        </div>
      </form>
    </div>
  )
}
