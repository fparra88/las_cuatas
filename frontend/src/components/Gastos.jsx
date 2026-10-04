import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import { hoyLocal, horaLocal } from '../fecha'
import { avisar, errorDeRespuesta } from '../avisos'
import Icono from './Icono'
import Cargando from './Cargando'
import Confirmar from './Confirmar'

export default function Gastos() {
  const [gastos, setGastos] = useState(null)
  const [fecha, setFecha] = useState(hoyLocal())
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [porEliminar, setPorEliminar] = useState(null)   // gasto pendiente de confirmar
  const [eliminando, setEliminando] = useState(false)

  const load = async () => {
    try {
      const r = await fetch(`${API_URL}/api/gastos?fecha=${fecha}`)
      if (!r.ok) throw new Error()
      setGastos(await r.json())
    } catch {
      setGastos(g => g || [])
      avisar('No se pudieron cargar los gastos', 'error')
    }
  }

  useEffect(() => { setGastos(null); load() }, [fecha])

  const agregar = async () => {
    // Antes, con datos incompletos simplemente no pasaba nada y no se decia por que.
    if (!descripcion.trim()) return setErrorForm('Escribe en qué se gastó.')
    if (!monto || parseFloat(monto) <= 0) return setErrorForm('Escribe un monto mayor a cero.')
    setErrorForm('')
    setGuardando(true)
    try {
      const r = await fetch(`${API_URL}/api/gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion: descripcion.trim(), monto: parseFloat(monto) })
      })
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo guardar el gasto'))
      avisar(`Gasto de $${parseFloat(monto).toFixed(2)} registrado`)
      setDescripcion('')
      setMonto('')
      load()
    } catch (e) {
      avisar(e.message === 'Failed to fetch' ? 'Sin conexión: el gasto no se guardó' : e.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    setEliminando(true)
    try {
      const r = await fetch(`${API_URL}/api/gastos/${porEliminar.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(await errorDeRespuesta(r, 'No se pudo eliminar el gasto'))
      avisar('Gasto eliminado')
      load()
    } catch (e) {
      avisar(e.message === 'Failed to fetch' ? 'Sin conexión: el gasto no se eliminó' : e.message, 'error')
    } finally {
      setEliminando(false)
      setPorEliminar(null)
    }
  }

  const total = (gastos || []).reduce((a, g) => a + g.monto, 0)

  return (
    <div className="min-h-screen p-5 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-4xl font-bold text-marca-oscuro mb-6 bg-white/85 rounded-2xl px-5 py-3 inline-block">Gastos</h2>

        {/* Formulario nuevo gasto */}
        <div className="bg-white rounded-3xl border border-crema-borde p-6 mb-5">
          <h3 className="font-bold text-xl mb-4">Registrar gasto</h3>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={descripcion}
              onChange={e => { setDescripcion(e.target.value); setErrorForm('') }}
              placeholder="¿En qué se gastó?"
              className="h-14 border border-crema-borde rounded-xl px-4 text-lg"
            />
            <div className="flex gap-3">
              <input
                type="number"
                inputMode="decimal"
                value={monto}
                onChange={e => { setMonto(e.target.value); setErrorForm('') }}
                onKeyDown={e => e.key === 'Enter' && agregar()}
                placeholder="Monto $"
                min="0"
                step="0.01"
                className="flex-1 min-w-0 h-14 border border-crema-borde rounded-xl px-4 text-lg"
              />
              <button onClick={agregar} disabled={guardando} className="h-14 px-6 rounded-xl bg-marca text-white font-bold flex items-center gap-2 disabled:opacity-60">
                <Icono nombre="mas" grosor={2.2} />{guardando ? 'Guardando…' : 'Agregar'}
              </button>
            </div>
            {errorForm && <p className="text-cancelado font-bold text-sm">{errorForm}</p>}
          </div>
        </div>

        {/* Filtro fecha */}
        <div className="bg-white rounded-2xl border border-crema-borde p-3 mb-5 flex items-center gap-3">
          <label htmlFor="fecha-gastos" className="font-bold pl-2">Fecha</label>
          <input
            id="fecha-gastos"
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="h-12 border border-crema-borde rounded-xl px-4 font-medium flex-1"
          />
          <button onClick={load} aria-label="Recargar" className="w-12 h-12 rounded-xl bg-marca text-white flex items-center justify-center">
            <Icono nombre="recargar" className="w-6 h-6" />
          </button>
        </div>

        {/* Lista gastos */}
        {gastos === null ? (
          <div className="bg-white rounded-2xl"><Cargando /></div>
        ) : gastos.length === 0 ? (
          <div className="bg-white/90 rounded-2xl text-center text-tinta-suave py-12">
            <p className="text-xl font-bold text-tinta">Sin gastos registrados</p>
            <p>Los gastos de este día aparecerán aquí.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5 mb-5">
              {gastos.map(g => (
                <div key={g.id} className="bg-white rounded-2xl border border-crema-borde pl-5 pr-3 py-3 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{g.descripcion}</p>
                    <p className="text-sm text-tinta-suave">{horaLocal(g.fecha_hora)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-bold text-cancelado text-xl">${g.monto.toFixed(2)}</p>
                    <button onClick={() => setPorEliminar(g)} aria-label={`Eliminar gasto ${g.descripcion}`}
                            className="w-12 h-12 rounded-xl border border-cancelado-borde bg-cancelado-claro text-cancelado flex items-center justify-center">
                      <Icono nombre="basura" className="w-[22px] h-[22px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-marca-oscuro text-white rounded-3xl p-6 text-center">
              <p className="text-sm opacity-80">TOTAL GASTOS DEL DÍA</p>
              <p className="text-4xl font-bold">${total.toFixed(2)}</p>
            </div>
          </>
        )}
      </div>

      {porEliminar && (
        <Confirmar
          peligro
          titulo="¿Eliminar gasto?"
          mensaje={`${porEliminar.descripcion} · $${porEliminar.monto.toFixed(2)}`}
          confirmarLabel="Sí, eliminar"
          cargando={eliminando}
          onConfirm={eliminar}
          onCancel={() => setPorEliminar(null)}
        />
      )}
    </div>
  )
}
