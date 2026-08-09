// Quita acentos y mayusculas para comparar texto sin importar tildes/caso
// (ej. "cafe" encuentra "Café").
export const normalizar = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
