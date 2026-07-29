import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// QR de pie de ticket. Se genera en negro/blanco puro (mejor lectura
// térmica) a bajo nivel de corrección de error para impresión rápida.
export default function TicketQR({ url, sizeMm = 22 }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    if (!url) return
    let activo = true
    QRCode.toDataURL(url, {
      margin: 0,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(d => { if (activo) setDataUrl(d) })
    return () => { activo = false }
  }, [url])

  if (!url || !dataUrl) return null

  return (
    <img
      src={dataUrl}
      alt="QR"
      className="ticket-qr"
      style={{ width: `${sizeMm}mm`, height: `${sizeMm}mm` }}
    />
  )
}
