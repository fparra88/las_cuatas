import React from 'react'

export default function Cargando({ texto = 'Cargando…', className = 'py-10' }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 text-tinta-suave ${className}`}>
      <span className="w-8 h-8 rounded-full border-4 border-crema-borde border-t-marca animate-spin" />
      <span className="text-sm font-medium">{texto}</span>
    </div>
  )
}
