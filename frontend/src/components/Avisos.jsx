import React, { useEffect, useState } from 'react'
import { suscribir } from '../avisos'
import Icono from './Icono'

export default function Avisos() {
  const [estado, setEstado] = useState({ avisos: [], conectado: true })
  useEffect(() => suscribir(setEstado), [])

  return (
    <div className="no-print fixed bottom-24 sm:bottom-5 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2 w-[min(92vw,420px)] pointer-events-none">
      {!estado.conectado && (
        <div role="alert" className="aviso-entra w-full flex items-center gap-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 px-4 py-3 font-bold shadow-lg">
          <Icono nombre="alerta" className="w-5 h-5 shrink-0" />
          Sin conexión con el servidor. Reintentando…
        </div>
      )}
      {estado.avisos.map(a => (
        <div
          key={a.id}
          role="status"
          className={`aviso-entra w-full flex items-center gap-3 rounded-xl px-4 py-3 font-bold shadow-lg border
            ${a.tipo === 'error'
              ? 'bg-cancelado-claro border-cancelado-borde text-cancelado-oscuro'
              : 'bg-[#E9F4EE] border-[#BCD9C8] text-[#1F5A3E]'}`}
        >
          <Icono nombre={a.tipo === 'error' ? 'alerta' : 'check'} className="w-5 h-5 shrink-0" />
          {a.texto}
        </div>
      ))}
    </div>
  )
}
