from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Mesa, EstadoMesa
from schemas import Mesa as MesaSchema

router = APIRouter(prefix="/api/mesas", tags=["mesas"])

@router.get("")
def obtener_mesas(tipo: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Mesa)
    if tipo:
        q = q.filter(Mesa.tipo == tipo)
    return q.all()

@router.get("/{mesa_id}")
def obtener_mesa(mesa_id: int, db: Session = Depends(get_db)):
    mesa = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not mesa:
        raise HTTPException(status_code=404)
    return mesa

@router.post("")
def crear_mesa(numero: int, capacidad: int, db: Session = Depends(get_db)):
    db_mesa = Mesa(numero=numero, capacidad=capacidad, estado=EstadoMesa.DISPONIBLE)
    db.add(db_mesa)
    db.commit()
    db.refresh(db_mesa)
    return db_mesa

@router.put("/{mesa_id}")
def actualizar_mesa(mesa_id: int, estado: str, db: Session = Depends(get_db)):
    db_mesa = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not db_mesa:
        raise HTTPException(status_code=404)
    db_mesa.estado = estado
    db.commit()
    db.refresh(db_mesa)
    return db_mesa
