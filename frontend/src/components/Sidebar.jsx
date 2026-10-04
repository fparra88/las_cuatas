import React, { useState } from 'react'
import logo from '../imagenes/logo1.png'
import CorteDia from './CorteDia'
import Productos from './Productos'
import Tickets from './Tickets'
import Icono from './Icono'

const NAV = [
  { key: 'mesas',      label: 'Mesas',       icon: 'mesa' },
  { key: 'barras',     label: 'Barras',      icon: 'barra' },
  { key: 'paraLlevar', label: 'Para llevar', icon: 'llevar' },
  { key: 'gastos',     label: 'Gastos',      icon: 'gastos' },
]

// En tablet vertical (< 1024 px) arranca compacta, solo iconos: fija a 224 px
// se comia casi un tercio de la pantalla. En telefono (< 640 px) no hay barra
// lateral: el menu pasa a una barra inferior (ver mas abajo).
const inicioCompacto = () => typeof window !== 'undefined' && window.innerWidth < 1024

export default function Sidebar({ seccion, onSeccion }) {
  const [modal, setModal] = useState(null)   // null | 'tickets' | 'productos' | 'corte'
  const [compacto, setCompacto] = useState(inicioCompacto)
  const [masAbierto, setMasAbierto] = useState(false)

  const extras = [
    { key: 'tickets', label: 'Tickets', icon: 'ticket' },
    { key: 'productos', label: 'Productos', icon: 'productos' },
    { key: 'corte', label: 'Corte del día', icon: 'corte' },
  ]

  const boton = (activo) =>
    `w-full flex items-center gap-3 h-[52px] rounded-xl transition-colors text-base
     ${compacto ? 'justify-center px-0' : 'px-4'}
     ${activo ? 'bg-marca-oscuro text-white font-bold' : 'text-marca-texto font-medium hover:bg-marca-hover'}`

  const item = ({ key, icon, label }, activo, onClick) => (
    <button key={key} onClick={onClick} className={boton(activo)} aria-label={compacto ? label : undefined} title={compacto ? label : undefined}>
      <Icono nombre={icon} className="w-[22px] h-[22px] shrink-0" />
      {!compacto && <span>{label}</span>}
    </button>
  )

  return (
    <>
      {/* Tablet y escritorio: barra lateral */}
      <aside className={`hidden sm:flex ${compacto ? 'w-[76px]' : 'w-56'} shrink-0 min-h-screen bg-marca flex-col px-3 py-4 gap-1 sticky top-0 h-screen overflow-y-auto`}>
        <button
          onClick={() => setCompacto(c => !c)}
          aria-label={compacto ? 'Expandir menú' : 'Compactar menú'}
          className={`h-11 shrink-0 rounded-xl text-marca-texto hover:bg-marca-hover flex items-center ${compacto ? 'justify-center' : 'justify-end px-3'}`}
        >
          <Icono nombre="menu" className="w-5 h-5" />
        </button>
        {!compacto && (
          <div className="flex items-center justify-center pb-4 mb-2 border-b border-marca-borde">
            <img src={logo} alt="Las Cuatas" className="h-42 w-auto object-contain" />
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {NAV.map(n => item(n, seccion === n.key, () => onSeccion(n.key)))}
        </nav>

        <div className="h-px bg-marca-borde my-3 mx-1 shrink-0" />

        <div className="flex flex-col gap-1">
          {extras.map(e => item(e, false, () => setModal(e.key)))}
        </div>
      </aside>

      {/* Telefono: barra inferior fija; Tickets/Productos/Corte bajo "Más" */}
      <nav className="sm:hidden no-print fixed bottom-0 inset-x-0 z-40 bg-marca grid grid-cols-5 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,.15)]">
        {NAV.map(n => (
          <button
            key={n.key} onClick={() => onSeccion(n.key)}
            className={`h-16 flex flex-col items-center justify-center gap-1 text-[11px] ${seccion === n.key ? 'text-white font-bold bg-marca-oscuro' : 'text-marca-texto font-medium'}`}
          >
            <Icono nombre={n.icon} className="w-6 h-6" />{n.label}
          </button>
        ))}
        <button onClick={() => setMasAbierto(true)} className="h-16 flex flex-col items-center justify-center gap-1 text-[11px] text-marca-texto font-medium">
          <Icono nombre="menu" className="w-6 h-6" />Más
        </button>
      </nav>

      {masAbierto && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setMasAbierto(false)}>
          <div className="w-full bg-white rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1.5 rounded-full bg-crema-borde mx-auto mb-2" />
            {extras.map(e => (
              <button
                key={e.key} onClick={() => { setMasAbierto(false); setModal(e.key) }}
                className="h-14 px-4 rounded-2xl bg-crema flex items-center gap-3 text-lg font-bold text-marca-oscuro"
              >
                <Icono nombre={e.icon} className="w-6 h-6" />{e.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {modal === 'tickets' && <Tickets onClose={() => setModal(null)} />}
      {modal === 'productos' && <Productos onClose={() => setModal(null)} />}
      {modal === 'corte' && <CorteDia onClose={() => setModal(null)} />}
    </>
  )
}
