"""Gastos fijos (Renta, Sueldos): reglas compartidas entre el corte y la pantalla Gastos.

- Se aplican solos al efectuar el corte de un dia de lunes a viernes. Dia sin
  corte = dia que no acumula.
- El "apartado de la semana" suma lo aplicado de lunes al dia consultado. El
  lunes arranca una semana nueva, asi que el saldo vuelve a 0 sin borrar nada.
  Lo que el corte de hoy aun va a aplicar se reporta aparte (pendiente_hoy).
- La semana se arma con CierreCaja.fecha (dia de negocio, YYYY-MM-DD) y no con
  fecha_hora, para no depender de la conversion UTC/local.
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from models import CierreCaja, Gasto, GastoFijo


def aplica_en(d: date) -> bool:
    """Lunes (0) a viernes (4)."""
    return d.weekday() < 5


def fijos_del_dia(d: date, db: Session) -> list:
    """Lo que el corte de `d` descontaria por gastos fijos (vacio en fin de semana)."""
    if not aplica_en(d):
        return []
    return [f for f in db.query(GastoFijo).order_by(GastoFijo.id).all() if (f.monto_diario or 0) > 0]


def saldo_semana(d: date, db: Session) -> dict:
    lunes = d - timedelta(days=d.weekday())
    fijos = db.query(GastoFijo).order_by(GastoFijo.id).all()
    totales = {f.id: 0.0 for f in fijos}

    filas = (db.query(Gasto.gasto_fijo_id, Gasto.monto, CierreCaja.fecha)
             .join(CierreCaja, Gasto.cierre_id == CierreCaja.id)
             .filter(Gasto.gasto_fijo_id.isnot(None),
                     CierreCaja.fecha >= lunes.isoformat(),
                     CierreCaja.fecha <= d.isoformat())
             .all())
    dias = {f for _, _, f in filas}
    for fijo_id, monto, _ in filas:
        totales[fijo_id] = totales.get(fijo_id, 0.0) + (monto or 0)

    # `total` es solo lo de cortes ya hechos (el lunes antes del corte = 0).
    # Aparte va lo que se sumara al cortar hoy: el viernes antes del corte la
    # pantalla muestra total_con_hoy como lo que hay que pagar.
    cerrado = db.query(CierreCaja).filter(CierreCaja.fecha == d.isoformat()).first()
    hoy = {} if cerrado else {f.id: f.monto_diario for f in fijos_del_dia(d, db)}

    items = [{"id": f.id, "nombre": f.nombre,
              "total": round(totales.get(f.id, 0.0), 2),
              "total_con_hoy": round(totales.get(f.id, 0.0) + hoy.get(f.id, 0.0), 2)} for f in fijos]
    total = round(sum(i["total"] for i in items), 2)
    pendiente_hoy = round(sum(hoy.values()), 2)

    return {
        "desde": lunes.isoformat(),
        "hasta": d.isoformat(),
        "items": items,
        "total": total,
        "dias": len(dias),
        "pendiente_hoy": pendiente_hoy,
        "total_con_hoy": round(total + pendiente_hoy, 2),
        "es_viernes": d.weekday() == 4,
    }
