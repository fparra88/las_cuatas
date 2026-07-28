// Impresión de tickets térmicos 50mm.
//
// El navegador decide cuántas hojas genera a partir del tamaño de página
// declarado en @page. Chrome ignora `size: 50mm auto` y usa la altura del papel
// por defecto (Carta ~279mm), lo que produce hojas casi vacías y un salto a una
// segunda página. Para forzar UNA sola página se mide la altura real del ticket
// y se inyecta un @page con esa altura exacta antes de llamar a window.print().

const PX_POR_MM = 96 / 25.4
const ALTO_MINIMO_MM = 40
const MARGEN_SEGURIDAD_MM = 4
const STYLE_ID = 'ticket-page-size'

// Espera a que las imágenes del ticket (logo) carguen: si se mide antes,
// la altura calculada queda corta y el contenido se desborda a otra hoja.
function esperarImagenes(el) {
  const pendientes = Array.from(el.querySelectorAll('img')).filter(img => !img.complete)
  if (pendientes.length === 0) return Promise.resolve()
  return Promise.all(
    pendientes.map(img => new Promise(res => {
      img.addEventListener('load', res, { once: true })
      img.addEventListener('error', res, { once: true })
    }))
  )
}

function limpiarEstilo() {
  document.getElementById(STYLE_ID)?.remove()
}

export async function printTicket() {
  const el = document.getElementById('ticket-area')

  if (el) {
    await esperarImagenes(el)

    // scrollHeight incluye el contenido desbordado; getBoundingClientRect no.
    const altoPx = Math.max(el.scrollHeight, el.getBoundingClientRect().height)
    const altoMm = Math.max(
      ALTO_MINIMO_MM,
      Math.ceil(altoPx / PX_POR_MM) + MARGEN_SEGURIDAD_MM
    )

    limpiarEstilo()
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `@page { size: 50mm ${altoMm}mm; margin: 0; }`
    document.head.appendChild(style)
  }

  window.addEventListener('afterprint', limpiarEstilo, { once: true })
  window.print()
}

export default printTicket
