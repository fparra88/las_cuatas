from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Comensal, Mesa, EstadoMesa, Pedido
from tz import iso_utc
from schemas import Mesa as MesaSchema

router = APIRouter(prefix="/api/mesas", tags=["mesas"])

@router.get("")
def obtener_mesas(tipo: Optional[str] = None, db: Session = Depends(get_db)):
    # ORDER BY explicito: sin esto Postgres no garantiza el orden de las filas
    # (a diferencia de SQLite, que por implementacion solia devolver el orden
    # de insercion). El frontend usa la posicion en el array para numerar
    # ("Barra 1", "Barra 2"...), asi que un orden inestable se veia como
    # mesas/barras "mal numeradas" al cambiar de motor de BD.
    q = db.query(Mesa).order_by(Mesa.numero)
    if tipo:
        q = q.filter(Mesa.tipo == tipo)
    mesas = q.all()

    # Cuenta abierta por mesa/barra para las tarjetas (total, platillos y desde
    # cuando). Dos queries agregados en total, no uno por mesa: la pantalla se
    # refresca cada 5 s en varias tablets.
    subtotal = func.sum(Pedido.cantidad * Pedido.precio_unitario)
    piezas = func.sum(Pedido.cantidad)
    desde = func.min(Pedido.creado_en)
    abiertas = {}
    for mesa_id, total, n, inicio in db.query(Pedido.mesa_id, subtotal, piezas, desde).filter(
            Pedido.mesa_id.isnot(None)).group_by(Pedido.mesa_id):
        abiertas[mesa_id] = [total or 0, n or 0, inicio]
    # Barras: los pedidos cuelgan del comensal, no de la mesa.
    for mesa_id, total, n, inicio in db.query(Comensal.mesa_id, subtotal, piezas, desde).join(
            Pedido, Pedido.comensal_id == Comensal.id).filter(
            Comensal.activo == 1).group_by(Comensal.mesa_id):
        previo = abiertas.get(mesa_id, [0, 0, None])
        inicios = [x for x in (previo[2], inicio) if x]
        abiertas[mesa_id] = [previo[0] + (total or 0), previo[1] + (n or 0),
                             min(inicios) if inicios else None]
    comensales = dict(db.query(Comensal.mesa_id, func.count(Comensal.id)).filter(
        Comensal.activo == 1).group_by(Comensal.mesa_id).all())

    resultado = []
    for m in mesas:
        total, n, inicio = abiertas.get(m.id, [0, 0, None])
        resultado.append({
            "id": m.id,
            "numero": m.numero,
            "capacidad": m.capacidad,
            "tipo": m.tipo,
            "estado": m.estado.value if m.estado else None,
            "creado_en": iso_utc(m.creado_en) if m.creado_en else None,
            "total_abierto": round(total, 2),
            "platillos": int(n),
            # ISO con 'Z': sin ella el navegador lee el UTC como hora local.
            "abierta_desde": iso_utc(inicio) if inicio else None,
            "comensales": comensales.get(m.id, 0),
        })
    return resultado

@router.get("/{mesa_id}")
def obtener_mesa(mesa_id: int, db: Session = Depends(get_db)):
    mesa = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    return mesa

@router.post("")
def crear_mesa(
    numero: int = Query(gt=0),
    capacidad: int = Query(gt=0, le=100),
    tipo: str = Query("mesa", pattern="^(mesa|barra)$"),
    db: Session = Depends(get_db),
):
    # numero es UNIQUE: sin este chequeo el duplicado reventaba con un 500.
    if db.query(Mesa).filter(Mesa.numero == numero).first():
        raise HTTPException(status_code=409, detail=f"Ya existe una mesa con el numero {numero}")
    db_mesa = Mesa(numero=numero, capacidad=capacidad, tipo=tipo, estado=EstadoMesa.DISPONIBLE)
    db.add(db_mesa)
    db.commit()
    db.refresh(db_mesa)
    return db_mesa

@router.put("/{mesa_id}")
def actualizar_mesa(mesa_id: int, estado: EstadoMesa, db: Session = Depends(get_db)):
    """estado tipado con el enum: antes cualquier string se grababa tal cual y
    dejaba la fila ilegible (esa mesa y GET /api/mesas tiraban 500 para siempre)."""
    db_mesa = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not db_mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    db_mesa.estado = estado
    db.commit()
    db.refresh(db_mesa)
    return db_mesa
