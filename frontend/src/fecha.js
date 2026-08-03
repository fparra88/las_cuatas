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
