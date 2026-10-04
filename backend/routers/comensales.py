from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from database import get_db
from models import Comensal, Mesa, Pedido, EstadoMesa

router = APIRouter(prefix="/api/comensales", tags=["comensales"])

class ComensalCreate(BaseModel):
    barra_id: int
    nombre: str = Field(min_length=1, max_length=80)

@router.post("")
def crear_comensal(data: ComensalCreate, db: Session = Depends(get_db)):
    barra = db.query(Mesa).filter(Mesa.id == data.barra_id).first()
    if not barra:
        raise HTTPException(status_code=404, detail="Barra no encontrada")
    nombre = data.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=422, detail="El nombre no puede estar vacio")
    comensal = Comensal(mesa_id=data.barra_id, nombre=nombre)
    db.add(comensal)
    if barra.estado == EstadoMesa.DISPONIBLE:
        barra.estado = EstadoMesa.OCUPADA
    db.commit()
    db.refresh(comensal)
    return {"id": comensal.id, "nombre": comensal.nombre, "mesa_id": comensal.mesa_id}

@router.get("/barra/{barra_id}")
def listar_comensales(barra_id: int, db: Session = Depends(get_db)):
    # order_by: Postgres no garantiza orden sin el y los comensales "brincaban"
    # de lugar en cada refresco.
    comensales = db.query(Comensal).filter(
        Comensal.mesa_id == barra_id, Comensal.activo == 1).order_by(Comensal.id).all()
    # Cuenta de cada uno en un solo query agregado, para la tarjeta.
    cuentas = {cid: (total or 0, n or 0) for cid, total, n in db.query(
        Pedido.comensal_id, func.sum(Pedido.cantidad * Pedido.precio_unitario), func.sum(Pedido.cantidad)
    ).filter(Pedido.comensal_id.in_([c.id for c in comensales])).group_by(Pedido.comensal_id)} if comensales else {}
    return [{"id": c.id, "nombre": c.nombre,
             "total": round(cuentas.get(c.id, (0, 0))[0], 2),
             "platillos": int(cuentas.get(c.id, (0, 0))[1])} for c in comensales]

@router.delete("/{comensal_id}")
def eliminar_comensal(comensal_id: int, db: Session = Depends(get_db)):
    c = db.query(Comensal).filter(Comensal.id == comensal_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comensal no encontrado")
    barra_id = c.mesa_id
    # Borrar tambien sus pedidos (la UI ya avisa "y sus pedidos"). Antes quedaban
    # huerfanos: nunca se cobraban ni aparecian en ningun lado.
    borrados = db.query(Pedido).filter(Pedido.comensal_id == comensal_id).delete(synchronize_session=False)
    db.delete(c)
    db.flush()
    otros = db.query(Comensal).filter(Comensal.mesa_id == barra_id, Comensal.activo == 1).count()
    if otros == 0:
        barra = db.query(Mesa).filter(Mesa.id == barra_id).first()
        if barra:
            barra.estado = EstadoMesa.DISPONIBLE
    db.commit()
    return {"ok": True, "pedidos_borrados": borrados}
