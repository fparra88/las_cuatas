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
     'Calle Nicolas Regules 63, Col. Mexicaltzingo, Guadalajara, Jal.',
     'Local 21, mercado Mexicaltzingo',
     'RFC: PAVF881210AY1',
     'Tel: 33 3228 3760',
  ],

  // PIE DE TICKET — cada string es una línea. Edítalo cuando quieras.
  pie: [
    '¡Gracias por su compra!',
    'Vuelva pronto',
    'visítanos en: ',
  ],

  // QR al final del pie de ticket. null/'' = no imprime QR.
  qrUrl: 'https://www.instagram.com/lascuatas_mexicaltzingo?igsh=cjR2dzhxYXZnY2Rx',
}
