import React from 'react'
import Icono from './Icono'
import { haceCuanto } from '../fecha'

// Piezas de interfaz repetidas en varias pantallas. Solo presentacion: ningun
// fetch ni estado aqui.

// Contenedor de una pantalla de seccion: padding que crece con el ancho.
export function Pantalla({ children, ancho = 'max-w-6xl' }) {
  return (
    <div className="min-h-screen px-4 py-5 sm:p-6 lg:p-8">
      <div className={`${ancho} mx-auto`}>{children}</div>
    </div>
  )
}

// Fila de titulo: boton de regreso opcional, titulo y acciones a la derecha.
export function Encabezado({ onBack, backLabel = 'Volver', titulo, subtitulo, children }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-5 flex-wrap">
      {onBack && (
        <button onClick={onBack} className="h-12 px-3 sm:px-4 rounded-xl border border-crema-borde bg-white font-medium text-marca-oscuro flex items-center gap-1.5 shrink-0">
          <Icono nombre="atras" grosor={2} />{backLabel}
        </button>
      )}
      <div className="bg-white/85 backdrop-blur rounded-2xl px-4 py-1.5 min-w-0">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-marca-oscuro truncate">{titulo}</h1>
        {subtitulo && <p className="text-tinta-suave text-sm sm:text-base">{subtitulo}</p>}
      </div>
      {children && <div className="ml-auto flex gap-2.5 flex-wrap">{children}</div>}
    </div>
  )
}

// Modal: pantalla completa en telefono, tarjeta centrada desde sm.
export function Modal({ titulo, onClose, acciones, pie, ancho = 'sm:max-w-2xl', children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true"
        className={`relative bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl ${ancho} flex flex-col overflow-hidden shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 sm:px-7 pt-4 sm:pt-6 pb-3">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-marca-oscuro flex-1 min-w-0 truncate">{titulo}</h2>
          {acciones}
          <button onClick={onClose} aria-label="Cerrar" className="w-12 h-12 shrink-0 rounded-xl border border-crema-borde text-marca-oscuro flex items-center justify-center">
            <Icono nombre="cerrar" className="w-6 h-6" grosor={2.2} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        {pie && <div className="border-t border-crema-linea px-4 sm:px-7 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">{pie}</div>}
      </div>
    </div>
  )
}

// Cantidad con - / + de 48 px.
export function Stepper({ cantidad, onMenos, onMas }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button onClick={onMenos} aria-label="Quitar uno"
              className="w-12 h-12 rounded-xl border border-crema-borde bg-white text-marca-oscuro flex items-center justify-center">
        <Icono nombre="menos" className="w-[22px] h-[22px]" grosor={2.2} />
      </button>
      <span className="w-9 text-center text-xl font-bold">{cantidad}</span>
      <button onClick={onMas} aria-label="Agregar uno"
              className="w-12 h-12 rounded-xl bg-marca text-white flex items-center justify-center">
        <Icono nombre="mas" className="w-[22px] h-[22px]" grosor={2.2} />
      </button>
    </div>
  )
}

// Boton de icono para borrar (rojo suave, 48 px).
export function BotonBorrar({ onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label}
            className="w-12 h-12 shrink-0 rounded-xl border border-cancelado-borde bg-cancelado-claro text-cancelado flex items-center justify-center">
      <Icono nombre="basura" className="w-[22px] h-[22px]" />
    </button>
  )
}

// Pildora de estado de mesa / barra.
export function EstadoPill({ ocupada }) {
  return (
    <span className={`text-xs sm:text-sm font-bold rounded-full px-3 py-1 shrink-0
      ${ocupada ? 'text-terracota-oscuro bg-terracota-claro' : 'text-[#1F6B4A] bg-[#DDF0E6]'}`}>
      {ocupada ? 'Ocupada' : 'Libre'}
    </span>
  )
}

export const fmt = (n) => Number(n || 0).toFixed(2)

// Tarjeta de una mesa o barra con su cuenta abierta (datos de GET /api/mesas).
// detalle: texto extra para barras ("3 comensales").
export function TarjetaLugar({ titulo, lugar, onClick, detalle }) {
  const ocupada = lugar.estado === 'ocupada'
  const conCuenta = lugar.platillos > 0
  return (
    <button
      onClick={onClick}
      className={`min-h-[136px] sm:min-h-[160px] rounded-3xl border-2 p-4 sm:p-6 text-left flex flex-col justify-between gap-3 transition-transform active:scale-[.98]
        ${ocupada ? 'border-[#E3B48F] bg-terracota-fondo' : 'border-crema-borde bg-white'}`}
    >
      <div className="flex justify-between items-start gap-2">
        <span className="font-display text-2xl sm:text-4xl font-bold leading-tight">{titulo}</span>
        <EstadoPill ocupada={ocupada} />
      </div>
      {conCuenta ? (
        <div>
          <p className="text-sm sm:text-[15px] text-tinta-suave">
            {lugar.abierta_desde && `Abierta ${haceCuanto(lugar.abierta_desde)} · `}
            {lugar.platillos} platillo{lugar.platillos !== 1 ? 's' : ''}{detalle ? ` · ${detalle}` : ''}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-terracota-oscuro">${fmt(lugar.total_abierto)}</p>
        </div>
      ) : (
        <p className={`text-sm sm:text-[15px] ${ocupada ? 'text-terracota-oscuro font-medium' : 'text-tinta-suave'}`}>
          {detalle || (ocupada ? 'Ocupada sin platillos' : 'Sin cuenta abierta')}
        </p>
      )}
    </button>
  )
}

// Contador "4 libres / 2 ocupadas" del encabezado de Mesas y Barras.
export function ResumenOcupacion({ lugares }) {
  const libres = lugares.filter(m => m.estado !== 'ocupada').length
  const ocupadas = lugares.length - libres
  const pill = 'flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-crema-borde text-sm font-medium'
  return (
    <>
      <span className={pill}><span className="w-2.5 h-2.5 rounded-full bg-[#2F7D5B]" />{libres} libre{libres !== 1 ? 's' : ''}</span>
      <span className={pill}><span className="w-2.5 h-2.5 rounded-full bg-terracota" />{ocupadas} ocupada{ocupadas !== 1 ? 's' : ''}</span>
    </>
  )
}
