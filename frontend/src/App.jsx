import React, { useState } from 'react'
import fondo from './imagenes/fondo_Mesa de trabajo 1.png'
import Sidebar from './components/Sidebar'
import MesasGrid from './components/MesasGrid'
import AgregarPedido from './components/AgregarPedido'
import ResumenMesa from './components/ResumenMesa'
import Cobro from './components/Cobro'
import Barras from './components/Barras'
import ParaLlevar from './components/ParaLlevar'
import Gastos from './components/Gastos'
import Avisos from './components/Avisos'

export default function App() {
  const [seccion, setSeccion] = useState('mesas')
  const [vista, setVista] = useState('mesas')
  const [mesa, setMesa] = useState(null)

  const handleSeccion = (s) => {
    setSeccion(s)
    setVista('mesas')
    setMesa(null)
  }

  const renderContent = () => {
    if (seccion === 'barras') return <Barras />
    if (seccion === 'paraLlevar') return <ParaLlevar />
    if (seccion === 'gastos') return <Gastos />

    // seccion === 'mesas'
    if (vista === 'pedidos' && mesa)
      return <AgregarPedido mesaId={mesa.id} titulo={`Mesa ${mesa.numero}`} onBack={() => setVista('resumen')} />
    if (vista === 'resumen' && mesa)
      return <ResumenMesa mesaId={mesa.id} num={mesa.numero} onAdd={() => setVista('pedidos')} onPay={() => setVista('cobro')} onBack={() => { setVista('mesas'); setMesa(null) }} />
    if (vista === 'cobro' && mesa)
      return <Cobro mesaId={mesa.id} num={mesa.numero} onDone={() => { setVista('mesas'); setMesa(null) }} onBack={() => setVista('resumen')} />

    return <MesasGrid onSelect={m => { setMesa(m); setVista('resumen') }} />
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundImage: `url(${fondo})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      <Sidebar seccion={seccion} onSeccion={handleSeccion} />
      {/* pb en telefono: deja libre la barra de navegacion inferior */}
      <main className="flex-1 min-w-0 overflow-x-hidden pb-20 sm:pb-0">
        {renderContent()}
      </main>
      <Avisos />
    </div>
  )
}
