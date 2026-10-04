import React, {useState} from 'react'
import {API_URL} from '../config'
import usePolling from '../usePolling'
import Cargando from './Cargando'
import {Pantalla, Encabezado, TarjetaLugar, ResumenOcupacion} from './ui'

export default function MesasGrid({onSelect}) {
  const [mesas, setMesas] = useState(null)

  usePolling(async () => {
    // tipo=mesa: sin filtro, esta vista mezclaba las barras (numero 101+)
    // entre las mesas.
    const r = await fetch(`${API_URL}/api/mesas?tipo=mesa`)
    if (!r.ok) throw new Error('mesas')
    setMesas(await r.json())
  }, 5000)

  return (
    <Pantalla>
      <Encabezado titulo="Mesas" subtitulo="Toca una mesa para ver su cuenta">
        {mesas && <ResumenOcupacion lugares={mesas} />}
      </Encabezado>

      {mesas === null ? (
        <div className="bg-white rounded-2xl"><Cargando texto="Cargando mesas…" /></div>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {mesas.map(m => (
            <TarjetaLugar key={m.id} titulo={`Mesa ${m.numero}`} lugar={m} onClick={() => onSelect(m)} />
          ))}
        </div>
      )}
    </Pantalla>
  )
}
