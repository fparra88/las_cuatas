from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Producto

router = APIRouter(prefix="/api/productos", tags=["productos"])

@router.get("")
def obtener_productos(categoria: str = None, db: Session = Depends(get_db)):
    query = db.query(Producto).filter(Producto.activo == 1)
    if categoria:
        query = query.filter(Producto.categoria == categoria)
    return query.all()

@router.get("/categorias")
def obtener_categorias(db: Session = Depends(get_db)):
    cats = db.query(Producto.categoria).distinct().all()
    return [c[0] for c in cats if c[0]]
