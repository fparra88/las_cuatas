import { describe, it, expect, vi } from 'vitest'
import { hoyLocal, horaLocal, haceCuanto } from './fecha'
import { normalizar } from './texto'
import { avisar, suscribir, errorDeRespuesta } from './avisos'
import { extrasDePago } from './components/PasosPago'

describe('fecha.js (dia de negocio en Guadalajara)', () => {
  it('a las 21:00 locales sigue siendo el mismo dia (no la fecha UTC)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T03:00:00Z'))   // 29 jul 21:00 en GDL
    expect(hoyLocal()).toBe('2026-07-29')
  })

  it('horaLocal convierte el ISO con Z a hora local', () => {
    expect(horaLocal('2026-07-29T18:30:00Z')).toMatch(/12:30/)
  })

  it('haceCuanto', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-29T12:00:00Z'))
    expect(haceCuanto('2026-07-29T12:00:00Z')).toBe('recién')
    expect(haceCuanto('2026-07-29T11:52:00Z')).toBe('hace 8 min')
    expect(haceCuanto('2026-07-29T10:40:00Z')).toBe('hace 1 h 20 min')
    expect(haceCuanto('2026-07-29T10:00:00Z')).toBe('hace 2 h')
  })
})

describe('texto.normalizar', () => {
  it('ignora acentos y mayusculas', () => {
    expect(normalizar('Café CON Leche')).toBe('cafe con leche')
    expect(normalizar(null)).toBe('')
  })
})

describe('avisos.js', () => {
  it('errorDeRespuesta lee detail de texto de FastAPI', async () => {
    const r = { json: () => Promise.resolve({ detail: 'Día ya cerrado' }) }
    expect(await errorDeRespuesta(r)).toBe('Día ya cerrado')
  })

  it('errorDeRespuesta toma el primer error de validacion de Pydantic', async () => {
    const r = { json: () => Promise.resolve({ detail: [{ msg: 'monto invalido' }] }) }
    expect(await errorDeRespuesta(r)).toBe('monto invalido')
  })

  it('errorDeRespuesta usa el mensaje por defecto si no hay JSON', async () => {
    const r = { json: () => Promise.reject(new Error('html')) }
    expect(await errorDeRespuesta(r, 'Falló')).toBe('Falló')
  })

  it('avisar notifica y el aviso desaparece solo', () => {
    vi.useFakeTimers()
    const estados = []
    const quitar = suscribir(e => estados.push(e.avisos.map(a => a.texto)))
    avisar('Guardado')
    expect(estados.at(-1)).toContain('Guardado')
    vi.advanceTimersByTime(3000)
    expect(estados.at(-1)).not.toContain('Guardado')
    quitar()
  })
})

describe('extrasDePago (lineas extra del ticket)', () => {
  it('tarjeta: codigo de cobro', () => {
    expect(extrasDePago({ codigo_cobro: '1234' })).toEqual([{ label: 'Cod. cobro', valor: '1234' }])
  })

  it('efectivo: recibido y cambio', () => {
    expect(extrasDePago({ monto_recibido: 200, cambio: 64.5 })).toEqual([
      { label: 'Recibido', valor: '$200.00' },
      { label: 'Cambio', valor: '$64.50' },
    ])
  })

  it('sin datos de pago no agrega nada', () => {
    expect(extrasDePago({})).toEqual([])
    expect(extrasDePago(null)).toEqual([])
  })
})
