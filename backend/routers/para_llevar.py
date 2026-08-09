from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
from database import get_db
from models import OrdenLlevar, OrdenLlevarItem, Producto
from pagos import resolver_pago
from schemas import MetodoPago
from tickets import registrar_ticket
from tz import iso_utc, rango_dia_utc

router = APIRouter(prefix="/api/para-llevar", tags=["para-llevar"])

class ItemIn(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0, le=999)
    # Solo para productos editables: sobrescriben nombre/precio de ESA linea.
    nombre_personalizado: Optional[str] = None
    precio_unitario: Optional[float] = Field(default=None, ge=0)

class OrdenIn(BaseModel):
    # min_length=1: antes se creaban ordenes vacias de $0 que ensuciaban el corte.
    items: List[ItemIn] = Field(min_length=1)
    metodo_pago: MetodoPago
    # Tarjeta: obligatorio. Efectivo: opcional (para calcular el cambio).
    codigo_cobro: Optional[str] = Field(default=None, max_length=50)
    monto_recibido: Optional[float] = Field(default=None, ge=0)

@router.post("")
def crear_orden(data: OrdenIn, db: Session = Depends(get_db)):
    total = 0.0
    items_build = []
    for item in data.items:
        p = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
        # Nombre/precio libres solo si el catalogo marca el producto editable.
        if p.editable:
            nombre = (item.nombre_personalizado or "").strip() or p.nombre
            precio = item.precio_unitario if item.precio_unitario is not None else p.precio
            if precio < 0:
                raise HTTPException(status_code=400, detail="Precio invalido")
        else:
            nombre, precio = p.nombre, p.precio
        total += precio * item.cantidad
        items_build.append(OrdenLlevarItem(producto_nombre=nombre, cantidad=item.cantidad, precio_unitario=precio))
    total = round(total, 2)

    # Mismas reglas que mesas y barras (tarjeta -> codigo, efectivo -> cambio).
    codigo, recibido, cambio = resolver_pago(
        data.metodo_pago, data.codigo_cobro, data.monto_recibido, total)

    orden = OrdenLlevar(total=total, metodo_pago=data.metodo_pago,
                        codigo_cobro=codigo, monto_recibido=recibido)
    db.add(orden)
    db.flush()
    for i in items_build:
        i.orden_id = orden.id
        db.add(i)

    ticket = registrar_ticket(
        db, origen="llevar", subtitulo="Para Llevar", total=total,
        metodo_pago=data.metodo_pago,
        items=[{"nombre": i.producto_nombre, "cantidad": i.cantidad,
                "precio_unitario": i.precio_unitario} for i in items_build],
        codigo_cobro=codigo, monto_recibido=recibido, cambio=cambio,
        orden_llevar_id=orden.id,
    )
    db.commit()
    db.refresh(ticket)
    return {"id": orden.id, "folio": ticket.id, "total": total, "metodo_pago": data.metodo_pago,
            "codigo_cobro": codigo, "monto_recibido": recibido, "cambio": cambio}

@router.get("")
def listar_ordenes(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(OrdenLlevar)
    if fecha:
        # Mismo dia local que el corte.
        _, start, end = rango_dia_utc(fecha)
        q = q.filter(OrdenLlevar.fecha_hora >= start, OrdenLlevar.fecha_hora < end)
    ordenes = q.order_by(OrdenLlevar.fecha_hora.desc()).all()
    result = []
    for o in ordenes:
        items = db.query(OrdenLlevarItem).filter(OrdenLlevarItem.orden_id == o.id).all()
        result.append({
            "id": o.id,
            "total": o.total,
            "metodo_pago": o.metodo_pago,
            # ISO con 'Z' para que el navegador convierta a hora local.
            "fecha_hora": iso_utc(o.fecha_hora),
            "cerrado": o.cierre_id is not None,
            "items": [{"producto_nombre": i.producto_nombre, "cantidad": i.cantidad, "precio_unitario": i.precio_unitario, "subtotal": round(i.cantidad * i.precio_unitario, 2)} for i in items]
        })
    return result
