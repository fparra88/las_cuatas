import React, { useState } from 'react'

// Filtro de "no cualquiera" para borrar un producto de un pedido. Hardcodeado
// a proposito: no es autenticacion real (el endpoint DELETE sigue abierto),
// solo evita que un cliente o mesero sin autorizacion borre algo por error o
// a proposito desde la pantalla.
const CODIGO = '6923'

export default function PinPad({ titulo = 'Código requerido', onConfirm, onCancel }) {
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

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl text-center" onClick={e => e.stopPropagation()}>
        <p className="text-4xl mb-2">🔒</p>
        <p className="font-bold text-gray-800 mb-4">{titulo}</p>

        <div className="flex justify-center gap-2 mb-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${error ? 'border-red-400' : 'border-gray-300'}`}>
              {pin[i] ? '●' : ''}
            </div>
          ))}
        </div>
        <p className={`text-sm font-bold mb-2 h-5 ${error ? 'text-red-600' : 'text-transparent'}`}>Código incorrecto</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
            <button key={n} onClick={() => digitar(n)} className="bg-gray-100 hover:bg-gray-200 rounded-xl py-4 text-xl font-bold">{n}</button>
          ))}
          <button onClick={borrar} className="bg-gray-100 hover:bg-gray-200 rounded-xl py-4 text-xl font-bold">⌫</button>
          <button onClick={() => digitar('0')} className="bg-gray-100 hover:bg-gray-200 rounded-xl py-4 text-xl font-bold">0</button>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="bg-gray-200 text-gray-700 font-bold py-3 rounded-xl">Cancelar</button>
          <button onClick={aceptar} disabled={pin.length === 0} className="bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">Aceptar</button>
        </div>
      </div>
    </div>
  )
}
