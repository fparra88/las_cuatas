from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Ticket, TicketItem
from tickets import serializar_ticket
from tz import iso_utc, rango_dia_utc

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


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
    } for t in filas]


@router.get("/{ticket_id}")
def obtener_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Ticket completo con sus lineas, listo para reimprimir."""
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail=f"No existe el ticket #{ticket_id}")
    items = db.query(TicketItem).filter(TicketItem.ticket_id == ticket_id).order_by(TicketItem.id).all()
    return serializar_ticket(t, items)
