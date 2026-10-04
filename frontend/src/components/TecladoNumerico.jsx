import React from 'react'
import Icono from './Icono'

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

  const tecla = 'h-14 sm:h-16 rounded-2xl text-2xl font-bold active:scale-95 transition-transform flex items-center justify-center'
  const normal = `${tecla} border border-crema-borde bg-[#F8F5EF] hover:bg-crema`

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
        <button key={n} type="button" onClick={() => digitar(n)} className={normal}>{n}</button>
      ))}
      {decimales
        ? <button type="button" onClick={() => digitar('.')} className={normal}>.</button>
        : <button type="button" onClick={limpiar} aria-label="Limpiar" className={`${tecla} bg-cancelado-claro text-cancelado border border-cancelado-borde text-xl`}>C</button>}
      <button type="button" onClick={() => digitar('0')} className={normal}>0</button>
      <button type="button" onClick={borrar} aria-label="Borrar dígito" className={`${tecla} text-marca-oscuro hover:bg-crema`}>
        <Icono nombre="borrarDigito" className="w-7 h-7" />
      </button>
    </div>
  )
}
