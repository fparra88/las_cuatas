import React, {useState} from 'react'
import TecladoNumerico from './TecladoNumerico'
import Icono from './Icono'

const fmt = (n) => Number(n || 0).toFixed(2)

// Deja solo digitos, un punto y 2 decimales (el input acepta teclado fisico).
const limpiarMonto = (v) => {
  const [ent, ...resto] = v.replace(/[^\d.]/g, '').split('.')
  return resto.length ? `${ent}.${resto.join('').slice(0, 2)}` : ent
}

function Aviso({error}) {
  return error ? (
    <p role="alert" className="bg-cancelado-claro border border-cancelado-borde text-cancelado-oscuro font-bold rounded-xl p-3 text-center">{error}</p>
  ) : null
}

// Marco comun de los pasos de cobro: tarjeta centrada, ancha en tablet.
function Marco({children, ancho = 'max-w-xl'}) {
  return (
    <div className="min-h-screen px-3 py-5 sm:p-6 flex items-start sm:items-center justify-center">
      <div className={`${ancho} w-full bg-white rounded-3xl p-5 sm:p-8 shadow-sm`}>{children}</div>
    </div>
  )
}

function Cabecera({titulo, subtitulo, total}) {
  return (
    <div className="text-center mb-5">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-marca-oscuro">{titulo}</h1>
      <p className="text-tinta-suave mt-1">{subtitulo}</p>
      <p className="text-4xl sm:text-5xl font-bold text-marca-oscuro mt-2">${fmt(total)}</p>
    </div>
  )
}

const btnSecundario = 'h-14 rounded-2xl border border-crema-borde bg-white font-bold text-marca-oscuro flex items-center justify-center gap-2'
const btnCobrar = 'h-16 rounded-2xl bg-terracota text-white text-xl font-bold disabled:bg-crema-borde disabled:text-tinta-suave'

// Paso previo comun (mesa, barra y para llevar): "¿Generar el cobro de ...?".
export function ConfirmarCobro({titulo, subtitulo, total, onSi, onNo, noLabel = 'Volver', cargando, error}) {
  return (
    <Marco ancho="max-w-lg">
      <div className="w-16 h-16 rounded-2xl bg-terracota-claro text-terracota-oscuro flex items-center justify-center mx-auto mb-4">
        <Icono nombre="efectivo" className="w-9 h-9" />
      </div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-center text-marca-oscuro">{titulo}</h1>
      {subtitulo && <p className="text-center text-tinta-suave mt-1">{subtitulo}</p>}
      {total != null && <p className="text-center text-4xl font-bold text-marca-oscuro mt-3">${fmt(total)}</p>}
      <div className="my-5"><Aviso error={error} /></div>
      <div className="grid gap-2.5">
        <button onClick={onSi} disabled={cargando} className={btnCobrar}>{cargando ? 'Cargando…' : 'Sí, cobrar'}</button>
        <button onClick={onNo} className={btnSecundario}><Icono nombre="atras" grosor={2} />{noLabel}</button>
      </div>
    </Marco>
  )
}

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

  // ---- Elegir método ----
  if (paso === 'metodo') return (
    <Marco>
      <Cabecera titulo="Método de pago" subtitulo={subtitulo} total={total} />
      <Aviso error={error} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 my-5">
        <button onClick={() => setPaso('efectivo')} className="min-h-[140px] rounded-3xl border-2 border-[#BCD9C8] bg-[#E9F4EE] hover:border-[#2F7D5B] text-[#1F5A3E] flex flex-col items-center justify-center gap-3 transition-colors">
          <Icono nombre="efectivo" className="w-12 h-12" grosor={1.6} />
          <span className="text-lg sm:text-xl font-bold">Efectivo</span>
        </button>
        <button onClick={() => setPaso('tarjeta')} className="min-h-[140px] rounded-3xl border-2 border-[#C3D3E8] bg-[#EEF3FA] hover:border-[#2F5D93] text-[#24466F] flex flex-col items-center justify-center gap-3 transition-colors">
          <Icono nombre="tarjeta" className="w-12 h-12" grosor={1.6} />
          <span className="text-lg sm:text-xl font-bold">Tarjeta</span>
        </button>
      </div>
      <button onClick={onCancel} className={`w-full ${btnSecundario}`}><Icono nombre="atras" grosor={2} />Ver cuenta</button>
    </Marco>
  )

  // ---- Tarjeta: código de la terminal ----
  if (paso === 'tarjeta') {
    const enviar = () => codigo.trim() && !cargando && onCobrar({metodo_pago: 'tarjeta', codigo_cobro: codigo.trim()})
    return (
      <Marco ancho="max-w-4xl">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="flex flex-col gap-4">
            <Cabecera titulo="Pago con tarjeta" subtitulo={subtitulo} total={total} />
            <Aviso error={error} />
            <label className="font-bold">
              Código de autorización de la terminal
              <input
                autoFocus
                inputMode="numeric"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviar()}
                placeholder="Ej. 123456"
                className="mt-2 w-full h-16 border-2 border-crema-borde focus:border-marca outline-none rounded-2xl px-4 text-2xl font-bold text-center tracking-widest"
              />
            </label>
            <div className="hidden lg:grid gap-2.5 mt-auto">
              <button onClick={enviar} disabled={!codigo.trim() || cargando} className={btnCobrar}>{cargando ? 'Cobrando…' : 'Cerrar cobro'}</button>
              <button onClick={() => setPaso('metodo')} className={btnSecundario}><Icono nombre="atras" grosor={2} />Cambiar método</button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {/* Teclado tactil: el codigo de la terminal es numerico, sin decimales. */}
            <TecladoNumerico valor={codigo} onChange={setCodigo} decimales={false} maxLargo={12} />
            <div className="grid gap-2.5 lg:hidden mt-2">
              <button onClick={enviar} disabled={!codigo.trim() || cargando} className={btnCobrar}>{cargando ? 'Cobrando…' : 'Cerrar cobro'}</button>
              <button onClick={() => setPaso('metodo')} className={btnSecundario}><Icono nombre="atras" grosor={2} />Cambiar método</button>
            </div>
          </div>
        </div>
      </Marco>
    )
  }

  // ---- Efectivo: monto recibido + cambio en vivo ----
  const monto = parseFloat(recibido)
  const valido = !isNaN(monto) && monto >= total
  const cambio = valido ? monto - total : null
  const enviar = () => valido && !cargando && onCobrar({metodo_pago: 'efectivo', monto_recibido: monto})

  const botones = (
    <>
      <button onClick={enviar} disabled={!valido || cargando} className={btnCobrar}>{cargando ? 'Cobrando…' : 'Cerrar cobro'}</button>
      <button onClick={() => setPaso('metodo')} className={btnSecundario}><Icono nombre="atras" grosor={2} />Cambiar método</button>
    </>
  )

  return (
    <Marco ancho="max-w-4xl">
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="flex flex-col gap-4">
          <Cabecera titulo="Pago en efectivo" subtitulo={subtitulo} total={total} />
          <Aviso error={error} />
          <label className="font-bold">
            Monto recibido
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={recibido}
              // Se acepta teclado fisico, pero filtrado a numero para que coincida
              // con lo que escribe el teclado tactil.
              onChange={e => setRecibido(limpiarMonto(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="0.00"
              className="mt-2 w-full h-16 border-2 border-crema-borde focus:border-marca outline-none rounded-2xl px-4 text-3xl font-bold text-center"
            />
          </label>
          {/* Atajos de billete: suma rapida sin teclear */}
          <div className="grid grid-cols-4 gap-2">
            {[50, 100, 200, 500].map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setRecibido(fmt((parseFloat(recibido) || 0) + b))}
                className="h-12 rounded-xl bg-[#E9F4EE] border border-[#BCD9C8] text-[#1F5A3E] font-bold"
              >+{b}</button>
            ))}
          </div>
          {/* Cambio en vivo: el cajero lo ve antes de cerrar */}
          <div aria-live="polite" className={`rounded-2xl p-5 text-center ${valido ? 'bg-[#E9F4EE]' : 'bg-crema'}`}>
            <p className="text-sm font-bold text-tinta-suave uppercase tracking-wide">Cambio a devolver</p>
            <p className={`text-5xl font-bold ${valido ? 'text-[#1F5A3E]' : 'text-crema-borde'}`}>${fmt(cambio)}</p>
            {recibido !== '' && !valido && (
              <p className="text-sm text-cancelado font-bold mt-1">No cubre el total</p>
            )}
          </div>
          <div className="hidden lg:grid gap-2.5 mt-auto">{botones}</div>
        </div>
        <div className="flex flex-col gap-3">
          {/* Teclado tactil para capturar el monto rapido */}
          <TecladoNumerico valor={recibido} onChange={setRecibido} />
          <div className="grid gap-2.5 lg:hidden mt-2">{botones}</div>
        </div>
      </div>
    </Marco>
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
