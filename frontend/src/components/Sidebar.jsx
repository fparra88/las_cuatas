import React, { useState } from 'react'
import logo from '../imagenes/ticket.png'
import CorteDia from './CorteDia'

const NAV = [
  { key: 'mesas',      label: 'Mesas',      icon: '🍽️' },
  { key: 'barras',     label: 'Barras',     icon: '🍺' },
  { key: 'paraLlevar', label: 'Para Llevar', icon: '🛍️' },
  { key: 'gastos',     label: 'Gastos',     icon: '💸' },
]

export default function Sidebar({ seccion, onSeccion }) {
  const [corteOpen, setCorteOpen] = useState(false)

  return (
    <>
      <aside className="w-56 min-h-screen bg-[#336666] flex flex-col">
        <div className="flex items-center justify-center px-5 py-6 border-b border-[#2a5555]">
          <img src={logo} alt="Las Cuatas" className="h-20 w-auto object-contain" />
        </div>

        <nav className="flex-1 py-4">
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => onSeccion(item.key)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors
                ${seccion === item.key
                  ? 'bg-[#1f4444] text-white font-bold'
                  : 'text-[#c8e6e6] hover:bg-[#3d7777]'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-[#2a5555] p-3">
          <button
            onClick={() => setCorteOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-3 text-[#c8e6e6] hover:bg-[#3d7777] rounded-lg transition-colors"
          >
            <span className="text-xl">☰</span>
            <span className="font-bold">Corte del Día</span>
          </button>
        </div>
      </aside>

      {corteOpen && <CorteDia onClose={() => setCorteOpen(false)} />}
    </>
  )
}
