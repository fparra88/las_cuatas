from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Mesa, EstadoMesa
from schemas import Mesa as MesaSchema

router = APIRouter(prefix="/api/mesas", tags=["mesas"])

@router.get("")
def obtener_mesas(tipo: Optional[str] = None, db: Session = Depends(get_db)):
    # ORDER BY explicito: sin esto Postgres no garantiza el orden de las filas
    # (a diferencia de SQLite, que por implementacion solia devolver el orden
    # de insercion). El frontend usa la posicion en el array para numerar
    # ("Barra 1", "Barra 2"...), asi que un orden inestable se veia como
    # mesas/barras "mal numeradas" al cambiar de motor de BD.
    q = db.query(Mesa).order_by(Mesa.numero)
    if tipo:
        q = q.filter(Mesa.tipo == tipo)
    return q.all()

@router.get("/{mesa_id}")
def obtener_mesa(mesa_id: int, db: Session = Depends(get_db)):
    mesa = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    return mesa

@router.post("")
def crear_mesa(
    numero: int = Query(gt=0),
    capacidad: int = Query(gt=0, le=100),
    tipo: str = Query("mesa", pattern="^(mesa|barra)$"),
    db: Session = Depends(get_db),
):
    # numero es UNIQUE: sin este chequeo el duplicado reventaba con un 500.
    if db.query(Mesa).filter(Mesa.numero == numero).first():
        raise HTTPException(status_code=409, detail=f"Ya existe una mesa con el numero {numero}")
    db_mesa = Mesa(numero=numero, capacidad=capacidad, tipo=tipo, estado=EstadoMesa.DISPONIBLE)
    db.add(db_mesa)
    db.commit()
    db.refresh(db_mesa)
    return db_mesa

@router.put("/{mesa_id}")
def actualizar_mesa(mesa_id: int, estado: EstadoMesa, db: Session = Depends(get_db)):
    """estado tipado con el enum: antes cualquier string se grababa tal cual y
    dejaba la fila ilegible (esa mesa y GET /api/mesas tiraban 500 para siempre)."""
    db_mesa = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not db_mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    db_mesa.estado = estado
    db.commit()
    db.refresh(db_mesa)
    return db_mesa
