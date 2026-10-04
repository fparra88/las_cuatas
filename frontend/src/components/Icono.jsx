import React from 'react'

// Iconos de trazo para la interfaz (navegacion y acciones). Los iconos de los
// productos siguen siendo los emoji del catalogo: son datos, no interfaz.
const TRAZOS = {
  mesa: <><rect x="3" y="9" width="18" height="3" rx="1" /><path d="M6 12v7M18 12v7" /></>,
  barra: <path d="M5 8h14M8 8l-1 11M16 8l1 11M6 14h12" />,
  llevar: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8a3 3 0 016 0" /></>,
  gastos: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  ticket: <><path d="M4 5h16v14l-3-2-2.5 2-2.5-2-2.5 2L7 17l-3 2V5z" /><path d="M8 9h8M8 12h5" /></>,
  productos: <path d="M4 10h16M6 10l1 9h10l1-9M9 10V6h6v4" />,
  corte: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2" /></>,
  menos: <path d="M6 12h12" />,
  mas: <path d="M12 6v12M6 12h12" />,
  basura: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  atras: <path d="M15 6l-6 6 6 6" />,
  siguiente: <path d="M9 6l6 6-6 6" />,
  buscar: <><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></>,
  recargar: <><path d="M20 12a8 8 0 11-2.3-5.6" /><path d="M20 4v4h-4" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  alerta: <><path d="M12 4l9 16H3l9-16z" /><path d="M12 10v4M12 17h.01" /></>,
  prohibido: <><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></>,
  candado: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  borrarDigito: <><path d="M9 6h11v12H9l-5-6 5-6z" /><path d="M12.5 10l4 4M16.5 10l-4 4" /></>,
  imprimir: <><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14h10v6H7z" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  efectivo: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v5M18 9.5v5" /></>,
  tarjeta: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6 15h4" /></>,
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0116 0" /></>,
  editar: <><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>,
}

export default function Icono({ nombre, className = 'w-5 h-5', grosor = 1.9 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}
