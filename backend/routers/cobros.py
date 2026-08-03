from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Cobro, Mesa, Pedido, Producto, EstadoMesa, EstadoCobro, OrdenLlevar, Gasto, CierreCaja
from pagos import resolver_pago
from schemas import CobroCreate, MetodoPago, TicketGenerado
from tz import a_local, iso_utc, rango_dia_utc

router = APIRouter(prefix="/api/cobros", tags=["cobros"])

@router.post("/generar-ticket")
def generar_ticket(cobro: CobroCreate, db: Session = Depends(get_db)):
    mesa = db.query(Mesa).filter(Mesa.id == cobro.mesa_id).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    # outerjoin + nombre resuelto ANTES de borrar: antes se hacia un query por
    # linea despues del commit y si el producto ya no existia reventaba con 500
    # (con el cobro ya guardado y el ticket perdido).
    filas = db.query(Pedido, Producto.nombre).outerjoin(
        Producto, Pedido.producto_id == Producto.id
    ).filter(Pedido.mesa_id == cobro.mesa_id).all()
    if not filas:
        raise HTTPException(status_code=400, detail="La mesa no tiene pedidos")

    detalles = [{
        "producto": p.nombre_personalizado or nombre or "(producto eliminado)",
        "cantidad": p.cantidad,
        "precio_unitario": p.precio_unitario,
        "subtotal": round(p.cantidad * p.precio_unitario, 2)
    } for p, nombre in filas]
    total = round(sum(d["subtotal"] for d in detalles), 2)

    # El total se recalcula aqui, no se confia en el que vio el cajero:
    # pudieron agregarse platillos despues de imprimir la cuenta.
    codigo, recibido, cambio = resolver_pago(
        cobro.metodo_pago, cobro.codigo_cobro, cobro.monto_recibido, total)

    db_cobro = Cobro(mesa_id=cobro.mesa_id, total=total, metodo_pago=cobro.metodo_pago,
                     codigo_cobro=codigo, monto_recibido=recibido, estado=EstadoCobro.COMPLETADO)
    db.add(db_cobro)
    mesa.estado = EstadoMesa.DISPONIBLE
    for p, _ in filas:
        db.delete(p)
    db.commit()
    db.refresh(db_cobro)
    return TicketGenerado(id=db_cobro.id, numero_mesa=mesa.numero, total=total,
                          metodo_pago=cobro.metodo_pago, fecha_hora=db_cobro.fecha_hora,
                          pedidos=detalles, codigo_cobro=codigo,
                          monto_recibido=recibido, cambio=cambio)

@router.post("/cobrar-comensal")
def cobrar_comensal(
    comensal_id: int,
    metodo_pago: MetodoPago,
    codigo_cobro: Optional[str] = None,
    monto_recibido: Optional[float] = Query(default=None, ge=0),
    db: Session = Depends(get_db),
):
    from models import Comensal
    comensal = db.query(Comensal).filter(Comensal.id == comensal_id).first()
    if not comensal:
        raise HTTPException(status_code=404, detail="Comensal no encontrado")
    pedidos_con_prod = db.query(Pedido, Producto.nombre).outerjoin(Producto, Pedido.producto_id == Producto.id).filter(Pedido.comensal_id == comensal_id).all()
    if not pedidos_con_prod:
        raise HTTPException(status_code=400, detail="Sin pedidos")
    total = round(sum(p[0].cantidad * p[0].precio_unitario for p in pedidos_con_prod), 2)
    detalles = [{"producto": p.nombre_personalizado or nom or "(producto eliminado)", "cantidad": p.cantidad, "precio_unitario": p.precio_unitario, "subtotal": round(p.cantidad * p.precio_unitario, 2)} for p, nom in pedidos_con_prod]
    codigo, recibido, cambio = resolver_pago(metodo_pago, codigo_cobro, monto_recibido, total)
    cobro = Cobro(mesa_id=comensal.mesa_id, comensal_id=comensal_id, total=total,
                  metodo_pago=metodo_pago, codigo_cobro=codigo, monto_recibido=recibido)
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
    return {"id": cobro.id, "nombre": comensal.nombre, "total": total, "metodo_pago": metodo_pago,
            "pedidos": detalles, "codigo_cobro": codigo, "monto_recibido": recibido, "cambio": cambio}

def _calcular_corte(fecha: Optional[str], db: Session):
    """Corte del dia de negocio (hora de Guadalajara), solo filas sin cerrar.

    El rango se calcula sobre medianoche LOCAL y se traduce a UTC: antes se usaba
    el dia UTC y toda venta despues de las 18:00 caia en el corte del dia siguiente.
    """
    d, start, end = rango_dia_utc(fecha)

    # outerjoin: Cobro.mesa_id es nullable y un inner join borraba esos cobros
    # del corte (dinero cobrado que no aparecia en ningun lado).
    cobros = db.query(Cobro, Mesa.tipo).outerjoin(Mesa, Cobro.mesa_id == Mesa.id).filter(
        Cobro.fecha_hora >= start, Cobro.fecha_hora < end, Cobro.cierre_id.is_(None)
    ).all()

    # Todo lo que no es barra cuenta como mesa; asi ningun cobro queda fuera del total.
    barras = [c for c in cobros if c[1] == 'barra']
    mesas = [c for c in cobros if c[1] != 'barra']
    mesas_total = round(sum(c[0].total for c in mesas), 2)
    mesas_count = len(mesas)
    barras_total = round(sum(c[0].total for c in barras), 2)
    barras_count = len(barras)

    llevar = db.query(OrdenLlevar).filter(
        OrdenLlevar.fecha_hora >= start, OrdenLlevar.fecha_hora < end,
        OrdenLlevar.cierre_id.is_(None)
    ).all()
    llevar_total = round(sum(o.total for o in llevar), 2)
    llevar_count = len(llevar)

    gastos_q = db.query(Gasto).filter(
        Gasto.fecha_hora >= start, Gasto.fecha_hora < end, Gasto.cierre_id.is_(None)
    ).all()
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


def _serializar_cierre(c: CierreCaja):
    return {
        "id": c.id,
        "fecha": c.fecha,
        "ingresos": c.ingresos,
        "gastos": c.gastos,
        "efectivo_bruto": c.efectivo_bruto,
        "efectivo_neto": c.efectivo_neto,
        "tarjeta": c.tarjeta,
        "neto": c.neto,
        "creado_en": iso_utc(c.creado_en),
    }


@router.get("/corte")
def corte_dia(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    """Preview de lo pendiente de cerrar en ese dia. Si el dia ya se cerro, lo indica."""
    datos = _calcular_corte(fecha, db)
    cerrado = db.query(CierreCaja).filter(CierreCaja.fecha == datos["fecha"]).first()
    datos["cerrado"] = _serializar_cierre(cerrado) if cerrado else None
    return datos


@router.get("/cierres")
def listar_cierres(db: Session = Depends(get_db)):
    """Historial de cortes. Antes se guardaban y no habia forma de consultarlos."""
    return [_serializar_cierre(c) for c in
            db.query(CierreCaja).order_by(CierreCaja.fecha.desc()).all()]


@router.get("/cierres/{cierre_id}")
def obtener_cierre(cierre_id: int, db: Session = Depends(get_db)):
    c = db.query(CierreCaja).filter(CierreCaja.id == cierre_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")
    gastos = db.query(Gasto).filter(Gasto.cierre_id == cierre_id).all()
    return {
        **_serializar_cierre(c),
        "gastos_items": [{"id": g.id, "descripcion": g.descripcion, "monto": g.monto} for g in gastos],
        "cobros": db.query(Cobro).filter(Cobro.cierre_id == cierre_id).count(),
        "ordenes_llevar": db.query(OrdenLlevar).filter(OrdenLlevar.cierre_id == cierre_id).count(),
    }


@router.post("/efectuar-corte")
def efectuar_corte(fecha: Optional[str] = None, db: Session = Depends(get_db)):
    d, start, end = rango_dia_utc(fecha)

    # Un solo corte por dia: antes el doble click generaba dos cierres con
    # numeros distintos (el primero ya habia borrado los gastos).
    previo = db.query(CierreCaja).filter(CierreCaja.fecha == d.isoformat()).first()
    if previo:
        raise HTTPException(
            status_code=409,
            detail=f"El {d.isoformat()} ya tiene corte (#{previo.id}, {a_local(previo.creado_en):%H:%M}).",
        )

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
    db.flush()   # necesitamos cierre.id para marcar las filas

    # Marcar lo cerrado en vez de borrarlo: los gastos se perdian para siempre y
    # los cobros seguian apareciendo como pendientes en el corte siguiente.
    for modelo in (Cobro, OrdenLlevar, Gasto):
        db.query(modelo).filter(
            modelo.fecha_hora >= start, modelo.fecha_hora < end, modelo.cierre_id.is_(None)
        ).update({"cierre_id": cierre.id}, synchronize_session=False)

    db.commit()
    db.refresh(cierre)
    return {"id": cierre.id, "creado_en": iso_utc(cierre.creado_en), "cerrado": _serializar_cierre(cierre), **{k: v for k, v in c.items() if k != "cerrado"}}
