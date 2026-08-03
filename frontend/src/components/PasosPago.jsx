import React, {useState} from 'react'

const fmt = (n) => Number(n || 0).toFixed(2)

// Pasos de pago compartidos por mesas, barras y para llevar:
//   metodo -> tarjeta (codigo de terminal) | efectivo (monto recibido + cambio)
//
// Props:
//   total     -> total a cobrar (para validar el efectivo y mostrar el cambio)
//   subtitulo -> contexto ("Mesa 5", "Barra 2 — Juan", "Para Llevar")
//   onCobrar  -> async ({metodo_pago, codigo_cobro?, monto_recibido?})
//   onCancel  -> volver a la cuenta
//   error     -> mensaje del backend
//   cargando  -> bloquea los botones mientras vuela el POST
export default function PasosPago({total, subtitulo, onCobrar, onCancel, error, cargando}) {
  const [paso, setPaso] = useState('metodo')
  const [codigo, setCodigo] = useState('')
  const [recibido, setRecibido] = useState('')

  const Aviso = () => error ? (
    <p className="bg-red-50 border border-red-200 text-red-700 font-bold rounded-xl p-3 text-center mb-4">{error}</p>
  ) : null

  const Encabezado = ({icono, titulo}) => (
    <>
      {icono && <div className="text-6xl text-center mb-4">{icono}</div>}
      <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">{titulo}</h1>
      <p className="text-center text-gray-500 mb-8">
        {subtitulo} · Total <span className="font-bold text-gray-800">${fmt(total)}</span>
      </p>
    </>
  )

  // ---- Elegir método ----
  if (paso === 'metodo') return (
    <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-12">
        <Encabezado titulo="Método de pago" />
        <Aviso />
        <div className="grid grid-cols-2 gap-6">
          <button onClick={() => setPaso('efectivo')} className="p-10 rounded-2xl border-4 border-green-600 bg-green-50 hover:bg-green-600 hover:text-white transition">
            <div className="text-7xl mb-3">💵</div>
            <p className="font-bold text-xl">EFECTIVO</p>
          </button>
          <button onClick={() => setPaso('tarjeta')} className="p-10 rounded-2xl border-4 border-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition">
            <div className="text-7xl mb-3">💳</div>
            <p className="font-bold text-xl">TARJETA</p>
          </button>
        </div>
        <button onClick={onCancel} className="w-full mt-8 bg-gray-600 text-white font-bold py-4 rounded-xl">← Ver cuenta</button>
      </div>
    </div>
  )

  // ---- Tarjeta: código de la terminal ----
  if (paso === 'tarjeta') return (
    <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-3xl p-12">
        <Encabezado icono="💳" titulo="Pago con tarjeta" />
        <Aviso />
        <label className="block font-bold text-gray-700 mb-2">Código de cobro</label>
        <input
          autoFocus
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && codigo.trim() && !cargando && onCobrar({metodo_pago: 'tarjeta', codigo_cobro: codigo.trim()})}
          placeholder="Autorización de la terminal"
          className="w-full border-4 rounded-xl px-4 py-4 text-2xl font-bold text-center mb-8"
        />
        <button
          onClick={() => onCobrar({metodo_pago: 'tarjeta', codigo_cobro: codigo.trim()})}
          disabled={!codigo.trim() || cargando}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-xl mb-2 disabled:bg-gray-300"
        >{cargando ? 'Cobrando...' : '✅ Cerrar cobro'}</button>
        <button onClick={() => setPaso('metodo')} className="w-full bg-gray-600 text-white font-bold py-4 rounded-xl">← Cambiar método</button>
      </div>
    </div>
  )

  // ---- Efectivo: monto recibido + cambio en vivo ----
  const monto = parseFloat(recibido)
  const valido = !isNaN(monto) && monto >= total
  const cambio = valido ? monto - total : null
  const enviar = () => onCobrar({metodo_pago: 'efectivo', monto_recibido: monto})

  return (
    <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-3xl p-12">
        <Encabezado icono="💵" titulo="Pago en efectivo" />
        <Aviso />
        <label className="block font-bold text-gray-700 mb-2">Monto recibido</label>
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          value={recibido}
          onChange={e => setRecibido(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && valido && !cargando && enviar()}
          placeholder="0.00"
          className="w-full border-4 rounded-xl px-4 py-4 text-3xl font-bold text-center mb-4"
        />
        {/* Cambio en vivo: el cajero lo ve antes de cerrar */}
        <div className={`rounded-2xl p-6 text-center mb-8 ${valido ? 'bg-green-100' : 'bg-gray-100'}`}>
          <p className="text-sm font-bold text-gray-500 uppercase mb-1">Cambio a devolver</p>
          <p className={`text-5xl font-bold ${valido ? 'text-green-700' : 'text-gray-300'}`}>${fmt(cambio)}</p>
          {recibido !== '' && !valido && (
            <p className="text-sm text-red-600 font-bold mt-2">No cubre el total</p>
          )}
        </div>
        <button onClick={enviar} disabled={!valido || cargando} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-xl mb-2 disabled:bg-gray-300">
          {cargando ? 'Cobrando...' : '✅ Cerrar cobro'}
        </button>
        <button onClick={() => setPaso('metodo')} className="w-full bg-gray-600 text-white font-bold py-4 rounded-xl">← Cambiar método</button>
      </div>
    </div>
  )
}

// Líneas extra del comprobante (código / recibido / cambio) para <Ticket extras>.
export function extrasDePago(t) {
  const extras = []
  if (t?.codigo_cobro) extras.push({label: 'Cod. cobro', valor: t.codigo_cobro})
  if (t?.monto_recibido != null) {
    extras.push({label: 'Recibido', valor: `$${fmt(t.monto_recibido)}`})
    extras.push({label: 'Cambio', valor: `$${fmt(t.cambio)}`})
  }
  return extras
}
