import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PasosPago from './PasosPago'

const montar = (props = {}) => {
  const onCobrar = vi.fn()
  const onCancel = vi.fn()
  render(<PasosPago total={135.5} subtitulo="Mesa 5" onCobrar={onCobrar} onCancel={onCancel} {...props} />)
  return { onCobrar, onCancel }
}
const boton = (name) => screen.getAllByRole('button', { name })[0]

describe('PasosPago', () => {
  it('efectivo: muestra el cambio en vivo y cobra con el monto recibido', () => {
    const { onCobrar } = montar()
    fireEvent.click(boton(/Efectivo/))
    fireEvent.change(screen.getByLabelText('Monto recibido'), { target: { value: '200' } })
    expect(screen.getByText('$64.50')).toBeInTheDocument()
    fireEvent.click(boton('Cerrar cobro'))
    expect(onCobrar).toHaveBeenCalledWith({ metodo_pago: 'efectivo', monto_recibido: 200 })
  })

  it('efectivo: si no cubre el total no deja cobrar', () => {
    const { onCobrar } = montar()
    fireEvent.click(boton(/Efectivo/))
    fireEvent.change(screen.getByLabelText('Monto recibido'), { target: { value: '100' } })
    expect(screen.getByText('No cubre el total')).toBeInTheDocument()
    expect(boton('Cerrar cobro')).toBeDisabled()
    fireEvent.keyDown(screen.getByLabelText('Monto recibido'), { key: 'Enter' })
    expect(onCobrar).not.toHaveBeenCalled()
  })

  it('efectivo: el input filtra letras y deja 2 decimales', () => {
    montar()
    fireEvent.click(boton(/Efectivo/))
    const input = screen.getByLabelText('Monto recibido')
    fireEvent.change(input, { target: { value: 'a1b5.999' } })
    expect(input.value).toBe('15.99')
  })

  it('efectivo: atajos de billete suman', () => {
    montar()
    fireEvent.click(boton(/Efectivo/))
    fireEvent.click(boton('+100'))
    fireEvent.click(boton('+50'))
    expect(screen.getByLabelText('Monto recibido').value).toBe('150.00')
  })

  it('tarjeta: exige codigo de la terminal', () => {
    const { onCobrar } = montar()
    fireEvent.click(boton(/Tarjeta/))
    expect(boton('Cerrar cobro')).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Ej. 123456'), { target: { value: ' 4321 ' } })
    fireEvent.click(boton('Cerrar cobro'))
    expect(onCobrar).toHaveBeenCalledWith({ metodo_pago: 'tarjeta', codigo_cobro: '4321' })
  })

  it('muestra el error del backend y permite volver a la cuenta', () => {
    const { onCancel } = montar({ error: 'El monto recibido no cubre el total' })
    expect(screen.getByRole('alert')).toHaveTextContent('no cubre el total')
    fireEvent.click(boton(/Ver cuenta/))
    expect(onCancel).toHaveBeenCalled()
  })

  it('mientras cobra bloquea el boton', () => {
    montar({ cargando: true })
    fireEvent.click(boton(/Tarjeta/))
    expect(boton('Cobrando…')).toBeDisabled()
  })
})
