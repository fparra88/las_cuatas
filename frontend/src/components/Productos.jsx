import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import { normalizar } from '../texto'

const fmt = (n) => Number(n || 0).toFixed(2)
const VACIO = { nombre: '', categoria: '', precio: '', icono: '', activo: true }

export default function Productos({ onClose }) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState(null)          // {id?, nombre, categoria, precio, icono, activo}
  const [confirmando, setConfirmando] = useState(null) // {tipo:'guardar'|'eliminar', ...}
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    // todos=true: incluye inactivos, el admin necesita verlos para reactivarlos.
    const r = await fetch(`${API_URL}/api/productos?todos=true`)
    setProductos(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const categorias = [...new Set(productos.map(p => p.categoria))].sort()
  const q = normalizar(busqueda.trim())
  const visibles = q
    ? productos.filter(p => normalizar(p.nombre).includes(q))
    : (cat ? productos.filter(p => p.categoria === cat) : productos)

  const abrirNuevo = () => { setError(''); setForm({ ...VACIO, categoria: cat }) }
  const abrirEdicion = (p) => {
    setError('')
    setForm({ id: p.id, nombre: p.nombre, categoria: p.categoria, precio: p.precio, icono: p.icono || '', activo: !!p.activo })
  }

  const pedirConfirmacionGuardar = () => {
    if (!form.nombre.trim()) { setError('El nombre no puede estar vacío.'); return }
    if (!form.categoria.trim()) { setError('La categoría no puede estar vacía.'); return }
    const precio = parseFloat(form.precio)
    if (isNaN(precio) || precio < 0) { setError('Precio inválido.'); return }
    setError('')
    setConfirmando({ tipo: 'guardar', ...form, precio })
  }

  const pedirConfirmacionEliminar = (p) => {
    setError('')
    setConfirmando({ tipo: 'eliminar', id: p.id, nombre: p.nombre })
  }

  const ejecutar = async () => {
    setGuardando(true)
    setError('')
    try {
      let r
      if (confirmando.tipo === 'eliminar') {
        r = await fetch(`${API_URL}/api/productos/${confirmando.id}`, { method: 'DELETE' })
      } else {
        const body = {
          nombre: confirmando.nombre.trim(),
          categoria: confirmando.categoria.trim(),
          precio: confirmando.precio,
          icono: confirmando.icono.trim() || null,
        }
        if (confirmando.id) {
          body.activo = confirmando.activo
          r = await fetch(`${API_URL}/api/productos/${confirmando.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          })
        } else {
          r = await fetch(`${API_URL}/api/productos`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          })
        }
      }
      const data = await r.json()
      if (!r.ok) {
        const d = data.detail
        throw new Error(Array.isArray(d) ? d[0]?.msg || 'Datos inválidos' : d || 'No se pudo completar')
      }
      setConfirmando(null)
      setForm(null)
      await load()
    } catch (e) {
      // No se cierra el modal de confirmacion: es donde se muestra el error
      // (eliminar no tiene un form debajo donde mostrarlo).
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🍽️ Productos</h2>
          <div className="flex items-center gap-3">
            <button onClick={abrirNuevo} className="bg-green-600 text-white font-bold text-sm py-2 px-4 rounded-lg">＋ Nuevo</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">✕</button>
          </div>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar producto..."
          className="w-full border rounded-xl px-4 py-3 mb-3 text-lg"
        />

        <div className={`flex gap-2 mb-4 flex-wrap ${busqueda.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
          <button onClick={() => setCat('')} className={`py-1.5 px-3 rounded-lg text-sm font-bold ${cat === '' ? 'bg-[#336666] text-white' : 'bg-gray-100'}`}>Todas</button>
          {categorias.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`py-1.5 px-3 rounded-lg text-sm font-bold ${cat === c ? 'bg-[#336666] text-white' : 'bg-gray-100'}`}>{c}</button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8">Cargando...</p>
        ) : (
          <div className="space-y-2">
            {busqueda.trim() && visibles.length === 0 && (
              <p className="text-center text-gray-400 py-8">Sin resultados para "{busqueda}".</p>
            )}
            {visibles.map(p => (
              <div key={p.id} className={`flex justify-between items-center p-3 rounded-xl border ${p.activo ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100 opacity-60'}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl shrink-0">{p.icono || '🍽️'}</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-500">{p.categoria}{!p.activo && ' · inactivo'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-bold w-20 text-right">{p.editable ? 'libre' : `$${fmt(p.precio)}`}</p>
                  <button onClick={() => abrirEdicion(p)} className="bg-[#336666] text-white font-bold text-sm py-2 px-4 rounded-lg">Editar</button>
                  <button onClick={() => pedirConfirmacionEliminar(p)} className="text-red-400 hover:text-red-600 text-xl px-1">🗑️</button>
                </div>
              </div>
            ))}
            {visibles.length === 0 && <p className="text-center text-gray-400 py-8">Sin productos.</p>}
          </div>
        )}
      </div>

      {/* Form de creacion / edicion */}
      {form && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-800 mb-4">{form.id ? 'Editar producto' : 'Nuevo producto'}</h3>
            {error && <p className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-lg p-2 mb-3">{error}</p>}

            <label className="block text-sm font-bold text-gray-600 mb-1">Nombre</label>
            <input
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />

            <label className="block text-sm font-bold text-gray-600 mb-1">Categoría</label>
            <input
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />

            <label className="block text-sm font-bold text-gray-600 mb-1">Precio</label>
            <input
              type="number" step="0.01" min="0"
              value={form.precio}
              onChange={e => setForm({ ...form, precio: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />

            <label className="block text-sm font-bold text-gray-600 mb-1">Icono (emoji)</label>
            <input
              value={form.icono}
              onChange={e => setForm({ ...form, icono: e.target.value })}
              maxLength={4}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />

            {form.id && (
              <label className="flex items-center gap-2 mb-6 font-bold text-gray-700">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
                Activo (visible en el menú)
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setForm(null)} className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl">Cancelar</button>
              <button onClick={pedirConfirmacionGuardar} className="bg-[#336666] text-white font-bold py-3 rounded-xl">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmacion */}
      {confirmando && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4" onClick={() => !guardando && setConfirmando(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-4xl mb-3">{confirmando.tipo === 'eliminar' ? '🗑️' : '⚠️'}</p>
            {confirmando.tipo === 'eliminar' ? (
              <p className="font-bold text-lg text-gray-800 mb-1">¿Estás seguro de eliminar el producto: {confirmando.nombre}?</p>
            ) : (
              <>
                <p className="font-bold text-lg text-gray-800 mb-1">¿Estás seguro de aplicar este cambio al producto: {confirmando.nombre}?</p>
                <p className="text-sm text-gray-500 mb-6">{confirmando.categoria} · ${fmt(confirmando.precio)}</p>
              </>
            )}
            {error && <p className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-lg p-2 mb-3">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmando(null)} disabled={guardando} className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl disabled:opacity-50">Cancelar</button>
              <button
                onClick={ejecutar}
                disabled={guardando}
                className={`text-white font-bold py-3 rounded-xl disabled:opacity-50 ${confirmando.tipo === 'eliminar' ? 'bg-red-600' : 'bg-[#336666]'}`}
              >{guardando ? '...' : 'Sí, continuar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
