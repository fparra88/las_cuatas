import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GastosFijos from './GastosFijos'
import { respuesta } from '../test/setup'

const semana = (extra = {}) => ({
  desde: '2026-10-26', hasta: '2026-10-29',
  items: [{ id: 1, nombre: 'Renta', total: 900, total_con_hoy: 1200 },
          { id: 2, nombre: 'Sueldos', total: 3600, total_con_hoy: 4800 }],
  total: 4500, dias: 3, pendiente_hoy: 1500, total_con_hoy: 6000, es_viernes: false,
  ...extra,
})
const datos = (s = semana()) => ({
  fijos: [{ id: 1, nombre: 'Renta', monto_diario: 300 }, { id: 2, nombre: 'Sueldos', monto_diario: 1200 }],
  semana: s,
})

describe('GastosFijos', () => {
  it('muestra montos diarios y el apartado de la semana con lo de hoy', async () => {
    const fetch = vi.fn(() => respuesta(datos()))
    vi.stubGlobal('fetch', fetch)
    render(<GastosFijos fecha="2026-10-29" />)

    expect(await screen.findByLabelText('Renta')).toHaveValue(300)
    expect(screen.getByLabelText('Sueldos')).toHaveValue(1200)
    expect(fetch).toHaveBeenCalledWith('/api/gastos/fijos?fecha=2026-10-29')
    expect(screen.getByText(/Apartado de la semana/)).toBeInTheDocument()
    expect(screen.getByText('$1200.00')).toBeInTheDocument()
    expect(screen.getByText('$6000.00')).toBeInTheDocument()
    expect(screen.getByText(/Incluye \$1500.00 de hoy/)).toBeInTheDocument()
  })

  it('el viernes lo resalta como a pagar', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(datos(semana({ es_viernes: true, hasta: '2026-10-30' })))))
    render(<GastosFijos fecha="2026-10-30" />)
    expect(await screen.findByText(/A PAGAR HOY/)).toBeInTheDocument()
  })

  it('el lunes antes del corte arranca en 0', async () => {
    const lunes = semana({ desde: '2026-11-02', hasta: '2026-11-02', total: 0, pendiente_hoy: 0, total_con_hoy: 0,
      items: [{ id: 1, nombre: 'Renta', total: 0, total_con_hoy: 0 }, { id: 2, nombre: 'Sueldos', total: 0, total_con_hoy: 0 }] })
    vi.stubGlobal('fetch', vi.fn(() => respuesta(datos(lunes))))
    render(<GastosFijos fecha="2026-11-02" />)
    expect(await screen.findAllByText('$0.00')).toHaveLength(3)
    expect(screen.queryByText(/Incluye/)).toBeNull()
  })

  it('guardar manda el nuevo monto diario con PUT', async () => {
    const fetch = vi.fn((url, opts) => respuesta(opts?.method === 'PUT' ? { id: 1, nombre: 'Renta', monto_diario: 350 } : datos()))
    vi.stubGlobal('fetch', fetch)
    render(<GastosFijos fecha="2026-10-29" />)

    const input = await screen.findByLabelText('Renta')
    const [guardarRenta] = screen.getAllByRole('button', { name: 'Guardar' })
    expect(guardarRenta).toBeDisabled()   // sin cambios no hay nada que guardar
    fireEvent.change(input, { target: { value: '350' } })
    fireEvent.click(guardarRenta)

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/gastos/fijos/1', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ monto_diario: 350 }),
    })))
  })

  it('no manda montos negativos', async () => {
    const fetch = vi.fn(() => respuesta(datos()))
    vi.stubGlobal('fetch', fetch)
    render(<GastosFijos fecha="2026-10-29" />)
    fireEvent.change(await screen.findByLabelText('Renta'), { target: { value: '-5' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0])
    expect(fetch).not.toHaveBeenCalledWith('/api/gastos/fijos/1', expect.anything())
  })
})
