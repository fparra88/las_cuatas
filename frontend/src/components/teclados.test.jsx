import React, { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TecladoNumerico from './TecladoNumerico'
import PinPad from './PinPad'

// TecladoNumerico es controlado: se envuelve para ver el valor resultante.
function Controlado(props) {
  const [v, setV] = useState(props.inicial ?? '')
  return <><TecladoNumerico valor={v} onChange={setV} {...props} /><output>{v}</output></>
}
const teclear = (...teclas) => teclas.forEach(t => fireEvent.click(screen.getByRole('button', { name: t })))
const valor = () => screen.getByRole('status').textContent

describe('TecladoNumerico', () => {
  it('captura un monto con hasta 2 decimales', () => {
    render(<Controlado />)
    teclear('1', '2', '.', '5', '0', '9')
    expect(valor()).toBe('12.50')
  })

  it('un solo punto, y "." al inicio da "0."', () => {
    render(<Controlado />)
    teclear('.', '.', '5')
    expect(valor()).toBe('0.5')
  })

  it('en montos un 0 inicial se reemplaza', () => {
    render(<Controlado />)
    teclear('0', '7')
    expect(valor()).toBe('7')
  })

  it('en codigos (sin decimales) el 0 inicial se conserva y C limpia', () => {
    render(<Controlado decimales={false} />)
    teclear('0', '4')
    expect(valor()).toBe('04')
    expect(screen.queryByRole('button', { name: '.' })).toBeNull()
    teclear('Limpiar')
    expect(valor()).toBe('')
  })

  it('respeta maxLargo y borra el ultimo digito', () => {
    render(<Controlado maxLargo={3} />)
    teclear('1', '2', '3', '4')
    expect(valor()).toBe('123')
    teclear('Borrar dígito')
    expect(valor()).toBe('12')
  })
})

describe('PinPad', () => {
  it('con el codigo correcto confirma', () => {
    const onConfirm = vi.fn()
    render(<PinPad onConfirm={onConfirm} onCancel={() => {}} />)
    teclear('6', '9', '2', '3', 'Aceptar')
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('con codigo incorrecto avisa, limpia y no confirma', () => {
    const onConfirm = vi.fn()
    render(<PinPad onConfirm={onConfirm} onCancel={() => {}} />)
    teclear('1', '1', '1', '1', 'Aceptar')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Código incorrecto')).toHaveClass('text-cancelado')
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeDisabled()
  })

  it('Volver cancela', () => {
    const onCancel = vi.fn()
    render(<PinPad onConfirm={() => {}} onCancel={onCancel} />)
    teclear('Volver')
    expect(onCancel).toHaveBeenCalled()
  })
})
