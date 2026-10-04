// Paleta de la marca en un solo lugar: antes los hex (#336666, #1f4444...) se
// repetian a mano en cada componente.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          DEFAULT: '#336666',
          oscuro: '#1F4444',
          hover: '#3D7777',
          borde: '#2A5555',
          texto: '#DCEDED',
        },
        crema: { DEFAULT: '#F4F0E9', borde: '#DAD3C6', linea: '#EAE4D8' },
        terracota: { DEFAULT: '#B4531F', oscuro: '#8A3B0F', claro: '#FBDFC8', fondo: '#FFF6EE' },
        cancelado: { DEFAULT: '#B3261E', oscuro: '#8A1C14', claro: '#FFF3F2', borde: '#E7C4C0' },
        tinta: { DEFAULT: '#1E2A2A', suave: '#586767' },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
