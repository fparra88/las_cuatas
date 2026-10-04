// Fecha del negocio (Guadalajara / America/Mexico_City).
// Antes se usaba new Date().toISOString().split('T')[0], que da la fecha UTC:
// a las 18:00 hora local el selector brincaba al dia siguiente a media cena.
export const TZ = 'America/Mexico_City'

// 'YYYY-MM-DD' del dia de negocio actual. en-CA formatea justo asi.
export const hoyLocal = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: TZ })

// Hora local a partir de un ISO con 'Z' que manda el backend.
export const horaLocal = (iso) =>
  new Date(iso).toLocaleTimeString('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

// "hace 8 min", "hace 1 h 20 min" a partir de un ISO con 'Z'. Es una
// diferencia, asi que la zona horaria no importa.
export const haceCuanto = (iso) => {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h} h${min % 60 ? ` ${min % 60} min` : ''}`
}
