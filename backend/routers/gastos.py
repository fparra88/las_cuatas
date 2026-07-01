from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from database import get_db
from models import Gasto

router = APIRouter(prefix="/api/gastos", tags=["gastos"])

class GastoCreate(BaseModel):
    descripcion: str
    monto: float

@router.post("")
def crear_gasto(data: GastoCreate, db: Session = Depends(get_db)):
    g = Gasto(descripcion=data.descripcion.strip(), monto=data.monto)
    db.add(g)
    db.commit()
    db.refresh(g)
    return {"id": g.id, "descripcion": g.descripcion, "monto": g.monto, "fecha_hora": g.fecha_hora.isoformat()}

@router.get("")
def listar_gastos(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Gasto)
    if fecha:
        d = datetime.strptime(fecha, "%Y-%m-%d").date()
        start = datetime(d.year, d.month, d.day)
        end = start + timedelta(days=1)
        q = q.filter(Gasto.fecha_hora >= start, Gasto.fecha_hora < end)
    gastos = q.order_by(Gasto.fecha_hora.desc()).all()
    return [{"id": g.id, "descripcion": g.descripcion, "monto": g.monto, "fecha_hora": g.fecha_hora.isoformat()} for g in gastos]

@router.delete("/{gasto_id}")
def eliminar_gasto(gasto_id: int, db: Session = Depends(get_db)):
    g = db.query(Gasto).filter(Gasto.id == gasto_id).first()
    if not g:
        raise HTTPException(status_code=404)
    db.delete(g)
    db.commit()
    return {"ok": True}
