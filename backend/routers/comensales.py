from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Comensal, Mesa, EstadoMesa

router = APIRouter(prefix="/api/comensales", tags=["comensales"])

class ComensalCreate(BaseModel):
    barra_id: int
    nombre: str

@router.post("")
def crear_comensal(data: ComensalCreate, db: Session = Depends(get_db)):
    barra = db.query(Mesa).filter(Mesa.id == data.barra_id).first()
    if not barra:
        raise HTTPException(status_code=404)
    comensal = Comensal(mesa_id=data.barra_id, nombre=data.nombre.strip())
    db.add(comensal)
    if barra.estado == EstadoMesa.DISPONIBLE:
        barra.estado = EstadoMesa.OCUPADA
    db.commit()
    db.refresh(comensal)
    return {"id": comensal.id, "nombre": comensal.nombre, "mesa_id": comensal.mesa_id}

@router.get("/barra/{barra_id}")
def listar_comensales(barra_id: int, db: Session = Depends(get_db)):
    comensales = db.query(Comensal).filter(Comensal.mesa_id == barra_id, Comensal.activo == 1).all()
    return [{"id": c.id, "nombre": c.nombre} for c in comensales]

@router.delete("/{comensal_id}")
def eliminar_comensal(comensal_id: int, db: Session = Depends(get_db)):
    c = db.query(Comensal).filter(Comensal.id == comensal_id).first()
    if not c:
        raise HTTPException(status_code=404)
    barra_id = c.mesa_id
    db.delete(c)
    db.flush()
    otros = db.query(Comensal).filter(Comensal.mesa_id == barra_id, Comensal.activo == 1).count()
    if otros == 0:
        barra = db.query(Mesa).filter(Mesa.id == barra_id).first()
        if barra:
            barra.estado = EstadoMesa.DISPONIBLE
    db.commit()
    return {"ok": True}
