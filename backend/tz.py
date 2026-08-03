"""Zona horaria del negocio (Guadalajara / America/Mexico_City, UTC-6 sin DST).

Los timestamps se GUARDAN en UTC naive (asi estaban los datos historicos, no hay
migracion). Lo que cambia es que el "dia" del corte se calcula sobre hora local:
se toma la medianoche local y se convierte a UTC para filtrar.
"""
from datetime import date, datetime, time, timedelta
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

from fastapi import HTTPException

TZ = ZoneInfo("America/Mexico_City")
UTC = ZoneInfo("UTC")


def ahora_utc() -> datetime:
    """UTC naive. Reemplazo directo del datetime.utcnow() de los modelos."""
    return datetime.now(UTC).replace(tzinfo=None)


def hoy_local() -> date:
    """Fecha del negocio ahora mismo (no la fecha UTC)."""
    return datetime.now(TZ).date()


def parse_fecha(fecha: Optional[str]) -> date:
    """'YYYY-MM-DD' -> date. Sin valor = hoy local. Invalida = 422, no 500."""
    if not fecha:
        return hoy_local()
    try:
        return datetime.strptime(fecha, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Fecha invalida: '{fecha}'. Formato YYYY-MM-DD.")


def rango_dia_utc(fecha: Optional[str]) -> Tuple[date, datetime, datetime]:
    """(fecha_local, inicio_utc, fin_utc) del dia de negocio.

    Medianoche local -> UTC naive, para comparar contra las columnas guardadas.
    Ej. 2026-07-29 en Guadalajara = [2026-07-29 06:00Z, 2026-07-30 06:00Z).
    """
    d = parse_fecha(fecha)
    inicio_local = datetime.combine(d, time.min, tzinfo=TZ)
    fin_local = inicio_local + timedelta(days=1)
    inicio_utc = inicio_local.astimezone(UTC).replace(tzinfo=None)
    fin_utc = fin_local.astimezone(UTC).replace(tzinfo=None)
    return d, inicio_utc, fin_utc


def a_local(dt: datetime) -> datetime:
    """UTC naive -> aware en hora del negocio (para mostrar al usuario)."""
    return dt.replace(tzinfo=UTC).astimezone(TZ) if dt.tzinfo is None else dt.astimezone(TZ)


def iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """UTC naive -> ISO con 'Z'. Sin la Z, el navegador lo lee como hora local."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")
