// ============================================================
//  CONFIG DEL TICKET — edita libremente, no toca lógica.
//  Cambios se reflejan al imprimir / generar el ticket.
// ============================================================
export const TICKET_CONFIG = {
  // Nombre que sale bajo el logo.
  nombreNegocio: 'Las Cuatas de Gina',

  // Líneas de encabezado bajo el nombre (dirección, tel, RFC...).
  // Deja el arreglo vacío [] si no quieres ninguna.
  encabezado: [
    // 'Calle Ejemplo #123, Col. Centro',
    // 'Tel: 33 0000 0000',
  ],

  // PIE DE TICKET — cada string es una línea. Edítalo cuando quieras.
  pie: [
    '¡Gracias por su compra!',
    'Vuelva pronto',
  ],
}
