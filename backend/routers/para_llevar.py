from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from database import get_db
from models import OrdenLlevar, OrdenLlevarItem, Producto

router = APIRouter(prefix="/api/para-llevar", tags=["para-llevar"])

class ItemIn(BaseModel):
    producto_id: int
    cantidad: int

class OrdenIn(BaseModel):
    items: List[ItemIn]
    metodo_pago: str

@router.post("")
def crear_orden(data: OrdenIn, db: Session = Depends(get_db)):
    total = 0.0
    items_build = []
    for item in data.items:
        p = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
        total += p.precio * item.cantidad
        items_build.append(OrdenLlevarItem(producto_nombre=p.nombre, cantidad=item.cantidad, precio_unitario=p.precio))
    orden = OrdenLlevar(total=total, metodo_pago=data.metodo_pago)
    db.add(orden)
    db.flush()
    for i in items_build:
        i.orden_id = orden.id
        db.add(i)
    db.commit()
    return {"id": orden.id, "total": total}

@router.get("")
def listar_ordenes(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(OrdenLlevar)
    if fecha:
        d = datetime.strptime(fecha, "%Y-%m-%d").date()
        start = datetime(d.year, d.month, d.day)
        end = start + timedelta(days=1)
        q = q.filter(OrdenLlevar.fecha_hora >= start, OrdenLlevar.fecha_hora < end)
    ordenes = q.order_by(OrdenLlevar.fecha_hora.desc()).all()
    result = []
    for o in ordenes:
        items = db.query(OrdenLlevarItem).filter(OrdenLlevarItem.orden_id == o.id).all()
        result.append({
            "id": o.id,
            "total": o.total,
            "metodo_pago": o.metodo_pago,
            "fecha_hora": o.fecha_hora.isoformat(),
            "items": [{"producto_nombre": i.producto_nombre, "cantidad": i.cantidad, "precio_unitario": i.precio_unitario, "subtotal": round(i.cantidad * i.precio_unitario, 2)} for i in items]
        })
    return result
