// Avisos (toasts) y estado de conexion, sin Context ni librerias: un emisor
// minimo al que se suscribe <Avisos/>. Antes los errores de red se tragaban en
// silencio y el cajero no sabia si su accion se guardo.

let avisos = []
let conectado = true
const oyentes = new Set()
let siguienteId = 1

const notificar = () => oyentes.forEach(fn => fn({ avisos, conectado }))

export function suscribir(fn) {
  oyentes.add(fn)
  fn({ avisos, conectado })
  return () => oyentes.delete(fn)
}

// tipo: 'ok' | 'error'
export function avisar(texto, tipo = 'ok') {
  const id = siguienteId++
  avisos = [...avisos, { id, texto, tipo }]
  notificar()
  setTimeout(() => {
    avisos = avisos.filter(a => a.id !== id)
    notificar()
  }, tipo === 'error' ? 5000 : 2800)
}

export function marcarConexion(ok) {
  if (ok === conectado) return
  conectado = ok
  notificar()
}

// Mensaje legible de una respuesta de FastAPI: `detail` es texto en errores de
// negocio y una lista en errores de validacion de Pydantic.
export async function errorDeRespuesta(r, porDefecto = 'Algo salió mal') {
  const data = await r.json().catch(() => ({}))
  const d = data.detail
  if (Array.isArray(d)) return d[0]?.msg || porDefecto
  return d || porDefecto
}
