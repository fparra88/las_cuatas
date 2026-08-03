from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field
from database import get_db
from models import Gasto
from tz import iso_utc, rango_dia_utc

router = APIRouter(prefix="/api/gastos", tags=["gastos"])

class GastoCreate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=200)
    # gt=0: un gasto negativo inflaba el efectivo neto del corte.
    monto: float = Field(gt=0)

@router.post("")
def crear_gasto(data: GastoCreate, db: Session = Depends(get_db)):
    descripcion = data.descripcion.strip()
    if not descripcion:
        raise HTTPException(status_code=422, detail="La descripcion no puede estar vacia")
    g = Gasto(descripcion=descripcion, monto=data.monto)
    db.add(g)
    db.commit()
    db.refresh(g)
    return _serializar(g)

def _serializar(g: Gasto):
    return {"id": g.id, "descripcion": g.descripcion, "monto": g.monto,
            # ISO con 'Z': sin la Z el navegador leia el UTC como hora local (-6h).
            "fecha_hora": iso_utc(g.fecha_hora),
            "cerrado": g.cierre_id is not None}

@router.get("")
def listar_gastos(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Gasto)
    if fecha:
        # Mismo dia local que el corte, si no la lista y el corte no cuadran.
        _, start, end = rango_dia_utc(fecha)
        q = q.filter(Gasto.fecha_hora >= start, Gasto.fecha_hora < end)
    return [_serializar(g) for g in q.order_by(Gasto.fecha_hora.desc()).all()]

@router.delete("/{gasto_id}")
def eliminar_gasto(gasto_id: int, db: Session = Depends(get_db)):
    g = db.query(Gasto).filter(Gasto.id == gasto_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    if g.cierre_id is not None:
        raise HTTPException(status_code=409, detail="Ese gasto ya entro en un corte, no se puede borrar.")
    db.delete(g)
    db.commit()
    return {"ok": True}
