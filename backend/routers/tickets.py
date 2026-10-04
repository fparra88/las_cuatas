from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Cobro, OrdenLlevar, Ticket, TicketItem
from tickets import estado_cancelacion, serializar_ticket
from tz import ahora_utc, iso_utc, rango_dia_utc

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


class CancelacionIn(BaseModel):
    motivo: str = Field(min_length=1, max_length=200)


@router.get("")
def listar_tickets(
    fecha: Optional[str] = None,
    q: Optional[str] = None,
    origen: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Lista tickets del dia de negocio (hora de Guadalajara), sin las lineas.

    q busca por folio exacto si es un numero, o por subtitulo ("mesa 5", "juan").
    Los cancelados se listan tambien (con su marca): el registro no desaparece.
    """
    query = db.query(Ticket)
    if fecha:
        _, inicio, fin = rango_dia_utc(fecha)
        query = query.filter(Ticket.fecha_hora >= inicio, Ticket.fecha_hora < fin)
    if origen:
        query = query.filter(Ticket.origen == origen)
    if q:
        termino = q.strip()
        if termino.isdigit():
            query = query.filter(Ticket.id == int(termino))
        elif termino:
            query = query.filter(Ticket.subtitulo.ilike(f"%{termino}%"))

    filas = query.order_by(Ticket.id.desc()).limit(limit).all()
    return [{
        "id": t.id,
        "folio": t.id,
        "origen": t.origen,
        "subtitulo": t.subtitulo,
        "total": t.total,
        "metodo_pago": t.metodo_pago,
        "fecha_hora": iso_utc(t.fecha_hora),
        **estado_cancelacion(t),
    } for t in filas]


@router.get("/{ticket_id}")
def obtener_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Ticket completo con sus lineas, listo para reimprimir."""
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail=f"No existe el ticket #{ticket_id}")
    items = db.query(TicketItem).filter(TicketItem.ticket_id == ticket_id).order_by(TicketItem.id).all()
    return serializar_ticket(t, items)


@router.post("/{ticket_id}/cancelar")
def cancelar_venta(ticket_id: int, data: CancelacionIn, db: Session = Depends(get_db)):
    """Cancela la venta de un ticket: queda en el registro marcada como cancelada
    y deja de sumar en el corte. No reabre la mesa (los pedidos se borraron al
    cobrar) y no se puede deshacer.

    Solo antes del corte: un CierreCaja ya guardo sus totales, y cancelar despues
    dejaria el corte impreso descuadrado contra los tickets.
    """
    # .strip() a mano: Field(min_length=1) acepta '   '.
    motivo = data.motivo.strip()
    if not motivo:
        raise HTTPException(status_code=422, detail="Escribe el motivo de la cancelación.")

    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail=f"No existe el ticket #{ticket_id}")
    if t.cancelado:
        raise HTTPException(status_code=409, detail=f"La venta #{ticket_id} ya estaba cancelada.")

    venta = None
    if t.cobro_id:
        venta = db.query(Cobro).filter(Cobro.id == t.cobro_id).first()
    elif t.orden_llevar_id:
        venta = db.query(OrdenLlevar).filter(OrdenLlevar.id == t.orden_llevar_id).first()
    if venta is not None and venta.cierre_id is not None:
        raise HTTPException(
            status_code=409,
            detail=f"La venta #{ticket_id} ya está dentro de un corte de caja; no se puede cancelar.",
        )

    ahora = ahora_utc()
    for fila in (t, venta):
        if fila is None:
            continue
        fila.cancelado = 1
        fila.cancelado_en = ahora
        fila.motivo_cancelacion = motivo
    db.commit()

    items = db.query(TicketItem).filter(TicketItem.ticket_id == ticket_id).order_by(TicketItem.id).all()
    return serializar_ticket(t, items)
