import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import { normalizar } from '../texto'
import { avisar, errorDeRespuesta } from '../avisos'
import Icono from './Icono'
import Cargando from './Cargando'
import Confirmar from './Confirmar'
import { Modal, BotonBorrar, fmt } from './ui'

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
    try {
      // todos=true: incluye inactivos, el admin necesita verlos para reactivarlos.
      const r = await fetch(`${API_URL}/api/productos?todos=true`)
      if (!r.ok) throw new Error()
      setProductos(await r.json())
    } catch {
      avisar('No se pudo cargar el catálogo', 'error')
    } finally {
      setLoading(false)
    }
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

  const pedirConfirmacionGuardar = (e) => {
    e?.preventDefault()
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
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo completar'))
      avisar(confirmando.tipo === 'eliminar' ? `${confirmando.nombre} eliminado` : `${confirmando.nombre.trim()} guardado`)
      setConfirmando(null)
      setForm(null)
      await load()
    } catch (e) {
      // No se cierra la confirmacion: es donde se muestra el error
      // (eliminar no tiene un form debajo donde mostrarlo).
      setError(e.message === 'Failed to fetch' ? 'Sin conexión con el servidor.' : e.message)
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'w-full h-12 border border-crema-borde rounded-xl px-4 text-base focus:outline-none focus:border-marca'

  return (
    <Modal
      titulo="Productos"
      onClose={onClose}
      ancho="sm:max-w-3xl"
      acciones={
        <button onClick={abrirNuevo} className="h-12 px-4 rounded-xl bg-marca text-white font-bold flex items-center gap-1.5 shrink-0">
          <Icono nombre="mas" grosor={2.2} /><span className="hidden min-[400px]:inline">Nuevo</span>
        </button>
      }
    >
      <div className="px-4 sm:px-7 pb-6">
        <label className="flex items-center gap-2.5 h-12 border border-crema-borde rounded-xl px-4 text-tinta-suave mb-3">
          <Icono nombre="buscar" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto"
            className="flex-1 min-w-0 outline-none text-base text-tinta bg-transparent"
          />
        </label>

        <div className={`flex gap-2 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] ${busqueda.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
          {['', ...categorias].map(c => (
            <button
              key={c || '__todas'} onClick={() => setCat(c)}
              className={`shrink-0 h-10 px-4 rounded-full text-sm ${cat === c ? 'bg-marca text-white font-bold' : 'border border-crema-borde bg-white font-medium'}`}
            >{c || 'Todas'}</button>
          ))}
        </div>

        {loading ? (
          <Cargando />
        ) : visibles.length === 0 ? (
          <p className="text-center text-tinta-suave py-8">{busqueda.trim() ? `Sin resultados para "${busqueda}".` : 'Sin productos.'}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibles.map(p => (
              <div key={p.id} className={`flex items-center gap-3 p-2 pl-3 rounded-2xl border ${p.activo ? 'bg-white border-crema-borde' : 'bg-crema border-crema-borde opacity-70'}`}>
                <button onClick={() => abrirEdicion(p)} className="flex-1 min-w-0 min-h-[52px] flex items-center gap-3 text-left">
                  <span className="text-2xl shrink-0">{p.icono || '🍽️'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold truncate">{p.nombre}</span>
                    <span className="block text-xs text-tinta-suave">
                      {p.categoria}{!p.activo && <span className="text-cancelado font-bold"> · inactivo</span>}
                    </span>
                  </span>
                  <span className="font-bold shrink-0">{p.editable ? 'libre' : `$${fmt(p.precio)}`}</span>
                  <Icono nombre="editar" className="w-5 h-5 text-tinta-suave shrink-0" />
                </button>
                <BotonBorrar onClick={() => pedirConfirmacionEliminar(p)} label={`Eliminar ${p.nombre}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form de creacion / edicion */}
      {form && (
        <div className="fixed inset-0 bg-black/60 z-[55] flex items-end sm:items-center justify-center sm:p-4" onClick={() => setForm(null)}>
          <form
            onSubmit={pedirConfirmacionGuardar}
            className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 w-full sm:max-w-md shadow-2xl max-h-[95vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-7"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-2xl font-bold text-marca-oscuro mb-4">{form.id ? 'Editar producto' : 'Nuevo producto'}</h3>
            {error && !confirmando && <p role="alert" className="bg-cancelado-claro border border-cancelado-borde text-cancelado-oscuro text-sm font-bold rounded-xl p-3 mb-3">{error}</p>}

            <div className="grid grid-cols-[1fr_88px] gap-3 mb-3">
              <label className="text-sm font-bold">Nombre
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={`${campo} mt-1.5`} />
              </label>
              <label className="text-sm font-bold">Icono
                <input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })} maxLength={4} placeholder="🍽️" className={`${campo} mt-1.5 text-center text-xl`} />
              </label>
            </div>

            <label className="block text-sm font-bold mb-3">Categoría
              <input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} list="categorias-producto" className={`${campo} mt-1.5`} />
              <datalist id="categorias-producto">{categorias.map(c => <option key={c} value={c} />)}</datalist>
            </label>

            <label className="block text-sm font-bold mb-4">Precio
              <input type="number" inputMode="decimal" step="0.01" min="0" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} className={`${campo} mt-1.5`} />
            </label>

            {form.id && (
              <label className="flex items-center gap-3 mb-5 font-bold min-h-[48px] px-3 rounded-xl bg-crema">
                <input type="checkbox" className="w-6 h-6 accent-[#336666]" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
                Activo (visible en el menú)
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setForm(null)} className="h-14 rounded-xl border border-crema-borde bg-white font-bold text-marca-oscuro">Cancelar</button>
              <button type="submit" className="h-14 rounded-xl bg-marca text-white font-bold">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {confirmando && (
        <Confirmar
          peligro={confirmando.tipo === 'eliminar'}
          titulo={confirmando.tipo === 'eliminar' ? `¿Eliminar ${confirmando.nombre}?` : `¿Guardar ${confirmando.nombre.trim()}?`}
          mensaje={confirmando.tipo === 'eliminar'
            ? 'Desaparece del menú. Los tickets ya vendidos no cambian.'
            : `${confirmando.categoria.trim()} · $${fmt(confirmando.precio)}`}
          confirmarLabel={confirmando.tipo === 'eliminar' ? 'Sí, eliminar' : 'Sí, guardar'}
          cargando={guardando}
          error={error}
          onConfirm={ejecutar}
          onCancel={() => { setConfirmando(null); setError('') }}
        />
      )}
    </Modal>
  )
}
