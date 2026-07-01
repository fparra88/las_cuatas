from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from database import get_db
from models import Cobro, Mesa, Pedido, Producto, EstadoMesa, EstadoCobro, OrdenLlevar, Gasto, CierreCaja
from schemas import CobroCreate, TicketGenerado

router = APIRouter(prefix="/api/cobros", tags=["cobros"])

@router.post("/generar-ticket")
def generar_ticket(cobro: CobroCreate, db: Session = Depends(get_db)):
    mesa = db.query(Mesa).filter(Mesa.id == cobro.mesa_id).first()
    if not mesa:
        raise HTTPException(status_code=404)
    pedidos = db.query(Pedido).filter(Pedido.mesa_id == cobro.mesa_id).all()
    if not pedidos:
        raise HTTPException(status_code=400)
    total = sum(p.cantidad * p.precio_unitario for p in pedidos)
    db_cobro = Cobro(mesa_id=cobro.mesa_id, total=total, metodo_pago=cobro.metodo_pago, estado=EstadoCobro.COMPLETADO)
    db.add(db_cobro)
    mesa.estado = EstadoMesa.DISPONIBLE
    for p in pedidos:
        db.delete(p)
    db.commit()
    db.refresh(db_cobro)
    detalles = [{
        "producto": db.query(Producto).filter(Producto.id == p.producto_id).first().nombre,
        "cantidad": p.cantidad,
        "precio_unitario": p.precio_unitario,
        "subtotal": p.cantidad * p.precio_unitario
    } for p in pedidos]
    return TicketGenerado(id=db_cobro.id, numero_mesa=mesa.numero, total=total, metodo_pago=cobro.metodo_pago, fecha_hora=db_cobro.fecha_hora, pedidos=detalles)

@router.post("/cobrar-comensal")
def cobrar_comensal(comensal_id: int, metodo_pago: str, db: Session = Depends(get_db)):
    from models import Comensal
    comensal = db.query(Comensal).filter(Comensal.id == comensal_id).first()
    if not comensal:
        raise HTTPException(status_code=404)
    pedidos_con_prod = db.query(Pedido, Producto.nombre).join(Producto, Pedido.producto_id == Producto.id).filter(Pedido.comensal_id == comensal_id).all()
    if not pedidos_con_prod:
        raise HTTPException(status_code=400, detail="Sin pedidos")
    total = sum(p[0].cantidad * p[0].precio_unitario for p in pedidos_con_prod)
    detalles = [{"producto": nom, "cantidad": p.cantidad, "precio_unitario": p.precio_unitario, "subtotal": round(p.cantidad * p.precio_unitario, 2)} for p, nom in pedidos_con_prod]
    cobro = Cobro(mesa_id=comensal.mesa_id, comensal_id=comensal_id, total=total, metodo_pago=metodo_pago)
    db.add(cobro)
    comensal.activo = 0
    for p, _ in pedidos_con_prod:
        db.delete(p)
    db.flush()
    otros = db.query(Comensal).filter(Comensal.mesa_id == comensal.mesa_id, Comensal.activo == 1).count()
    if otros == 0:
        barra = db.query(Mesa).filter(Mesa.id == comensal.mesa_id).first()
        if barra:
            barra.estado = EstadoMesa.DISPONIBLE
    db.commit()
    return {"id": cobro.id, "nombre": comensal.nombre, "total": total, "metodo_pago": metodo_pago, "pedidos": detalles}

def _calcular_corte(fecha: Optional[str], db: Session):
    if fecha:
        d = datetime.strptime(fecha, "%Y-%m-%d").date()
    else:
        d = datetime.utcnow().date()
    start = datetime(d.year, d.month, d.day)
    end = start + timedelta(days=1)

    cobros = db.query(Cobro, Mesa.tipo).join(Mesa, Cobro.mesa_id == Mesa.id).filter(
        Cobro.fecha_hora >= start, Cobro.fecha_hora < end
    ).all()

    mesas_total = round(sum(c[0].total for c in cobros if c[1] == 'mesa'), 2)
    mesas_count = sum(1 for c in cobros if c[1] == 'mesa')
    barras_total = round(sum(c[0].total for c in cobros if c[1] == 'barra'), 2)
    barras_count = sum(1 for c in cobros if c[1] == 'barra')

    llevar = db.query(OrdenLlevar).filter(
        OrdenLlevar.fecha_hora >= start, OrdenLlevar.fecha_hora < end
    ).all()
    llevar_total = round(sum(o.total for o in llevar), 2)
    llevar_count = len(llevar)

    gastos_q = db.query(Gasto).filter(Gasto.fecha_hora >= start, Gasto.fecha_hora < end).all()
    gastos_total = round(sum(g.monto for g in gastos_q), 2)
    gastos_items = [{"id": g.id, "descripcion": g.descripcion, "monto": g.monto} for g in gastos_q]

    # Desglose por metodo de pago (cobros mesas/barras + ordenes para llevar)
    efectivo_bruto = round(
        sum(c[0].total for c in cobros if c[0].metodo_pago == 'efectivo')
        + sum(o.total for o in llevar if o.metodo_pago == 'efectivo'), 2)
    tarjeta_total = round(
        sum(c[0].total for c in cobros if c[0].metodo_pago == 'tarjeta')
        + sum(o.total for o in llevar if o.metodo_pago == 'tarjeta'), 2)

    ingresos = round(mesas_total + barras_total + llevar_total, 2)
    neto = round(ingresos - gastos_total, 2)
    # Efectivo: descuenta gastos. Tarjeta: solo informativo.
    efectivo_neto = round(efectivo_bruto - gastos_total, 2)

    # Mesas/barras ocupadas ahora (bloquean el corte).
    ocupadas = db.query(Mesa).filter(Mesa.estado == EstadoMesa.OCUPADA).count()

    return {
        "fecha": d.isoformat(),
        "mesas": {"total": mesas_total, "cantidad": mesas_count},
        "barras": {"total": barras_total, "cantidad": barras_count},
        "llevar": {"total": llevar_total, "cantidad": llevar_count},
        "ingresos": ingresos,
        "gastos": {"total": gastos_total, "cantidad": len(gastos_q), "items": gastos_items},
        "efectivo": {"bruto": efectivo_bruto, "neto": efectivo_neto},
        "tarjeta": {"total": tarjeta_total},
        "neto": neto,
        "total": ingresos,
        "ocupadas": ocupadas
    }


@router.get("/corte")
def corte_dia(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    return _calcular_corte(fecha, db)


@router.post("/efectuar-corte")
def efectuar_corte(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    # Bloquear si hay mesas o barras ocupadas.
    ocupadas = db.query(Mesa).filter(Mesa.estado == EstadoMesa.OCUPADA).count()
    if ocupadas:
        raise HTTPException(status_code=409, detail=f"Hay {ocupadas} mesa(s)/barra(s) ocupada(s). Cobra o cierra antes del corte.")

    c = _calcular_corte(fecha, db)
    cierre = CierreCaja(
        fecha=c["fecha"],
        ingresos=c["ingresos"],
        gastos=c["gastos"]["total"],
        efectivo_bruto=c["efectivo"]["bruto"],
        efectivo_neto=c["efectivo"]["neto"],
        tarjeta=c["tarjeta"]["total"],
        neto=c["neto"],
    )
    db.add(cierre)

    # Vaciar gastos del día (ya quedaron registrados en el cierre).
    d = datetime.strptime(c["fecha"], "%Y-%m-%d").date()
    start = datetime(d.year, d.month, d.day)
    end = start + timedelta(days=1)
    db.query(Gasto).filter(Gasto.fecha_hora >= start, Gasto.fecha_hora < end).delete()

    db.commit()
    db.refresh(cierre)
    return {"id": cierre.id, "creado_en": cierre.creado_en, **c}
