import React from 'react'

// Teclado numerico libre para capturar cantidades rapido con el dedo.
// No valida ni confirma nada: solo edita el string que le pasan.
// Ojo: PinPad.jsx es otra cosa (largo fijo de 4 y compara contra un codigo).
//
// Props:
//   valor      -> string que se esta editando ('' cuando esta vacio)
//   onChange   -> (nuevoValor: string)
//   decimales  -> permite punto y hasta 2 decimales (montos). false = solo enteros
//   maxLargo   -> maximo de digitos, sin contar el punto
export default function TecladoNumerico({valor = '', onChange, decimales = true, maxLargo = 9}) {
  const digitar = (d) => {
    if (valor.replace('.', '').length >= maxLargo) return

    if (d === '.') {
      if (!decimales || valor.includes('.')) return
      onChange(valor === '' ? '0.' : valor + '.')
      return
    }

    const dec = valor.split('.')[1]
    if (dec !== undefined && dec.length >= 2) return   // ya tiene centavos
    // Solo en montos: "05" no es un monto. En codigos el 0 inicial si importa.
    if (decimales && valor === '0') { onChange(d); return }
    onChange(valor + d)
  }

  const borrar = () => onChange(valor.slice(0, -1))
  const limpiar = () => onChange('')

  const Tecla = ({children, onClick, tono = 'bg-gray-100 hover:bg-gray-200 text-gray-800'}) => (
    <button type="button" onClick={onClick} className={`${tono} rounded-xl py-5 text-2xl font-bold active:scale-95 transition`}>
      {children}
    </button>
  )

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
        <Tecla key={n} onClick={() => digitar(n)}>{n}</Tecla>
      ))}
      {decimales
        ? <Tecla onClick={() => digitar('.')}>.</Tecla>
        : <Tecla onClick={limpiar} tono="bg-red-50 hover:bg-red-100 text-red-600">C</Tecla>}
      <Tecla onClick={() => digitar('0')}>0</Tecla>
      <Tecla onClick={borrar} tono="bg-amber-50 hover:bg-amber-100 text-amber-700">⌫</Tecla>
    </div>
  )
}
