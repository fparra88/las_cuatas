"""Registro de tickets, compartido por mesas, barras y para llevar.

Antes solo las ordenes para llevar guardaban sus lineas (OrdenLlevarItem): al
cobrar una mesa o una barra los Pedido se BORRAN, asi que el detalle de la
venta se perdia y era imposible reimprimir el ticket. Aqui se guarda una copia
de las lineas antes de que eso pase.
"""
from typing import List, Optional

from sqlalchemy.orm import Session

from models import Mesa, Ticket, TicketItem
from tz import iso_utc


def numero_barra(db: Session, mesa: Mesa) -> int:
    """Posicion visible de la barra (1..N).

    En la BD las barras son mesas con numero 101, 102... pero el cajero ve
    "Barra 1", "Barra 2". Se calcula por posicion (no restando 100) para que
    siga cuadrando si alguien crea barras con otra numeracion.
    """
    return db.query(Mesa).filter(Mesa.tipo == "barra", Mesa.numero < mesa.numero).count() + 1


def registrar_ticket(
    db: Session,
    *,
    origen: str,
    subtitulo: str,
    total: float,
    metodo_pago: str,
    items: List[dict],
    codigo_cobro: Optional[str] = None,
    monto_recibido: Optional[float] = None,
    cambio: Optional[float] = None,
    cobro_id: Optional[int] = None,
    orden_llevar_id: Optional[int] = None,
) -> Ticket:
    """Crea el Ticket y sus lineas. NO hace commit: corre dentro de la misma
    transaccion que la venta, para que un fallo aqui la revierta entera y no
    queden ventas cobradas sin comprobante.

    items: [{nombre, cantidad, precio_unitario, subtotal?}]
    """
    t = Ticket(
        origen=origen,
        subtitulo=subtitulo,
        total=total,
        metodo_pago=metodo_pago,
        codigo_cobro=codigo_cobro,
        monto_recibido=monto_recibido,
        cambio=cambio,
        cobro_id=cobro_id,
        orden_llevar_id=orden_llevar_id,
    )
    db.add(t)
    db.flush()   # necesitamos t.id para las lineas

    for it in items:
        cantidad = it["cantidad"]
        precio = it["precio_unitario"]
        subtotal = it.get("subtotal")
        if subtotal is None:
            subtotal = round(cantidad * precio, 2)
        db.add(TicketItem(
            ticket_id=t.id,
            nombre=it["nombre"],
            cantidad=cantidad,
            precio_unitario=precio,
            subtotal=subtotal,
        ))
    return t


def serializar_ticket(t: Ticket, items: List[TicketItem]) -> dict:
    """Forma que consume el componente Ticket.jsx del frontend."""
    return {
        "id": t.id,
        "folio": t.id,
        "origen": t.origen,
        "subtitulo": t.subtitulo,
        "total": t.total,
        "metodo_pago": t.metodo_pago,
        "codigo_cobro": t.codigo_cobro,
        "monto_recibido": t.monto_recibido,
        "cambio": t.cambio,
        "fecha_hora": iso_utc(t.fecha_hora),
        "items": [
            {
                "nombre": i.nombre,
                "cantidad": i.cantidad,
                "precio_unitario": i.precio_unitario,
                "subtotal": i.subtotal,
            }
            for i in items
        ],
    }
