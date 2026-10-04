import React, { useState } from 'react'
import Icono from './Icono'

// Filtro de "no cualquiera" para acciones delicadas (borrar un producto de un
// pedido, cancelar una venta). Hardcodeado a proposito: no es autenticacion
// real (los endpoints siguen abiertos), solo evita que un cliente o mesero sin
// autorizacion lo haga por error o a proposito desde la pantalla.
const CODIGO = '6923'

export default function PinPad({ titulo = 'Código requerido', detalle, peligro = false, onConfirm, onCancel }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const digitar = (d) => {
    if (pin.length >= 4) return
    setError(false)
    setPin(pin + d)
  }
  const borrar = () => { setError(false); setPin(pin.slice(0, -1)) }

  const aceptar = () => {
    if (pin === CODIGO) {
      onConfirm()
    } else {
      setError(true)
      setPin('')
    }
  }

  const tecla = 'h-16 rounded-2xl border border-crema-borde bg-[#F8F5EF] hover:bg-crema text-2xl font-bold active:scale-95 transition-transform'

  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        role="dialog" aria-modal="true"
        className={`bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center ${peligro ? 'border-t-[6px] border-cancelado' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <Icono nombre="candado" className={`w-9 h-9 mx-auto mb-2 ${peligro ? 'text-cancelado' : 'text-marca'}`} />
        <p className={`font-display text-xl font-bold ${peligro ? 'text-cancelado-oscuro' : 'text-marca-oscuro'}`}>{titulo}</p>
        {detalle && <p className="text-sm text-tinta-suave mt-1">{detalle}</p>}

        <div className="flex justify-center gap-4 mt-5 mb-1 h-7 items-center">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={`w-[18px] h-[18px] rounded-full ${pin[i] ? 'bg-marca-oscuro' : `border-2 ${error ? 'border-cancelado' : 'border-[#9AA8A8]'}`}`} />
          ))}
        </div>
        <p className={`text-sm font-bold mb-3 h-5 ${error ? 'text-cancelado' : 'text-transparent'}`}>Código incorrecto</p>

        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
            <button key={n} onClick={() => digitar(n)} className={tecla}>{n}</button>
          ))}
          <button onClick={borrar} aria-label="Borrar dígito" className="h-16 rounded-2xl text-marca-oscuro flex items-center justify-center hover:bg-crema">
            <Icono nombre="borrarDigito" className="w-7 h-7" />
          </button>
          <button onClick={() => digitar('0')} className={tecla}>0</button>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="h-14 rounded-xl border border-crema-borde bg-white font-bold text-marca-oscuro">Volver</button>
          <button onClick={aceptar} disabled={pin.length === 0} className={`h-14 rounded-xl font-bold text-white disabled:opacity-50 ${peligro ? 'bg-cancelado' : 'bg-marca'}`}>Aceptar</button>
        </div>
      </div>
    </div>
  )
}
