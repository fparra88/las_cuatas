"""Reglas de cierre de un cobro, compartidas por mesas, barras y para llevar.

Vivian duplicadas en cada endpoint; con una sola copia la regla no se desincroniza.
"""
from typing import Optional, Tuple

from fastapi import HTTPException


def resolver_pago(
    metodo_pago: str,
    codigo_cobro: Optional[str],
    monto_recibido: Optional[float],
    total: float,
) -> Tuple[Optional[str], Optional[float], Optional[float]]:
    """Valida los datos del pago y devuelve (codigo, recibido, cambio).

    - tarjeta: codigo de la terminal obligatorio (sirve para cuadrar el corte).
    - efectivo: monto recibido opcional, pero si viene tiene que cubrir el total.

    El total siempre lo calcula quien llama a partir de la BD, nunca el cliente:
    pudieron cambiar los pedidos despues de imprimir la cuenta.
    """
    if metodo_pago == "tarjeta":
        codigo = (codigo_cobro or "").strip()
        if not codigo:
            raise HTTPException(status_code=422, detail="Falta el codigo de cobro de la terminal")
        return codigo, None, None

    if monto_recibido is None:
        return None, None, None
    if monto_recibido < total:
        raise HTTPException(
            status_code=422,
            detail=f"El monto recibido (${monto_recibido:.2f}) no cubre el total (${total:.2f})",
        )
    return None, monto_recibido, round(monto_recibido - total, 2)
