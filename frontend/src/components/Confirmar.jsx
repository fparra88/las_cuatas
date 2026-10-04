import React from 'react'

// Confirmacion propia en lugar de window.confirm(): el dialogo del navegador
// es diminuto en tablet y en algunos navegadores se puede bloquear para siempre.
export default function Confirmar({ titulo, mensaje, confirmarLabel = 'Sí, continuar', peligro = false,
                                    cargando = false, error, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={cargando ? undefined : onCancel}>
      <div
        role="dialog" aria-modal="true"
        className={`bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl ${peligro ? 'border-t-[6px] border-cancelado' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <h2 className={`font-display text-2xl font-bold mb-2 ${peligro ? 'text-cancelado-oscuro' : 'text-marca-oscuro'}`}>{titulo}</h2>
        {mensaje && <p className="text-tinta-suave mb-6 leading-snug">{mensaje}</p>}
        {error && <p role="alert" className="bg-cancelado-claro border border-cancelado-borde text-cancelado-oscuro text-sm font-bold rounded-xl p-3 mb-4">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} disabled={cargando} className="h-14 rounded-xl border border-crema-borde bg-white font-bold text-marca-oscuro disabled:opacity-50">Volver</button>
          <button
            onClick={onConfirm} disabled={cargando}
            className={`h-14 rounded-xl font-bold text-white disabled:opacity-60 ${peligro ? 'bg-cancelado' : 'bg-marca'}`}
          >{cargando ? 'Un momento…' : confirmarLabel}</button>
        </div>
      </div>
    </div>
  )
}
