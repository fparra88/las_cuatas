import { useEffect, useRef } from 'react'
import { marcarConexion } from './avisos'

// Refresco periodico para que varias tablets vean lo mismo. Se pausa con la
// pestaña oculta (no tiene caso pegarle al servidor cada 3 s con la tablet
// bloqueada) y refresca al volver. Si fn lanza, se marca "sin conexión".
// activo=false lo apaga (p.ej. una vista de Barras que no esta en pantalla).
export default function usePolling(fn, ms, deps = [], activo = true) {
  const ref = useRef(fn)
  ref.current = fn

  useEffect(() => {
    if (!activo) return
    let vivo = true
    const tick = async () => {
      if (document.hidden) return
      try {
        await ref.current()
        if (vivo) marcarConexion(true)
      } catch {
        if (vivo) marcarConexion(false)
      }
    }
    tick()
    const i = setInterval(tick, ms)
    const alVolver = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      clearInterval(i)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [...deps, activo])
}
