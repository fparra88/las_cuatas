from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field
from database import get_db
from models import Pedido, Producto

router = APIRouter(prefix="/api/productos", tags=["productos"])

@router.get("")
def obtener_productos(categoria: str = None, todos: bool = False, db: Session = Depends(get_db)):
    query = db.query(Producto)
    if not todos:
        query = query.filter(Producto.activo == 1)
    if categoria:
        query = query.filter(Producto.categoria == categoria)
    return query.order_by(Producto.categoria, Producto.nombre).all()

@router.get("/categorias")
def obtener_categorias(db: Session = Depends(get_db)):
    cats = db.query(Producto.categoria).distinct().all()
    return [c[0] for c in cats if c[0]]


def _validar_nombre_categoria(nombre: Optional[str], categoria: Optional[str]):
    """.strip() en Pydantic Field(min_length=1) no cacha '   ': cuenta como
    3 caracteres validos y solo se ve vacio despues del strip."""
    if nombre is not None:
        nombre = nombre.strip()
        if not nombre:
            raise HTTPException(status_code=422, detail="El nombre no puede estar vacio")
    if categoria is not None:
        categoria = categoria.strip()
        if not categoria:
            raise HTTPException(status_code=422, detail="La categoria no puede estar vacia")
    return nombre, categoria


class ProductoCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    categoria: str = Field(min_length=1, max_length=60)
    precio: float = Field(ge=0)
    icono: Optional[str] = Field(default=None, max_length=10)


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=120)
    categoria: Optional[str] = Field(default=None, min_length=1, max_length=60)
    precio: Optional[float] = Field(default=None, ge=0)
    icono: Optional[str] = Field(default=None, max_length=10)
    activo: Optional[bool] = None


@router.post("")
def crear_producto(datos: ProductoCreate, db: Session = Depends(get_db)):
    nombre, categoria = _validar_nombre_categoria(datos.nombre, datos.categoria)
    if db.query(Producto).filter(Producto.nombre == nombre).first():
        raise HTTPException(status_code=409, detail=f"Ya existe un producto llamado '{nombre}'")
    p = Producto(nombre=nombre, categoria=categoria, precio=datos.precio,
                icono=(datos.icono or "").strip() or None, activo=1, editable=0)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{producto_id}")
def actualizar_producto(producto_id: int, datos: ProductoUpdate, db: Session = Depends(get_db)):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    nombre, categoria = _validar_nombre_categoria(datos.nombre, datos.categoria)
    if nombre is not None and nombre != p.nombre:
        if db.query(Producto).filter(Producto.nombre == nombre, Producto.id != producto_id).first():
            raise HTTPException(status_code=409, detail=f"Ya existe un producto llamado '{nombre}'")
        p.nombre = nombre
    if categoria is not None:
        p.categoria = categoria
    if datos.precio is not None:
        p.precio = datos.precio
    if datos.icono is not None:
        p.icono = datos.icono.strip() or None
    if datos.activo is not None:
        p.activo = 1 if datos.activo else 0

    db.commit()
    db.refresh(p)
    return p


@router.delete("/{producto_id}")
def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Un pedido abierto (aun no cobrado) puede tener una FK a este producto;
    # borrar la fila revienta esa foreign key en Postgres. Historicos (Cobro,
    # OrdenLlevarItem) no guardan producto_id, asi que no hay que revisarlos.
    en_uso = db.query(Pedido).filter(Pedido.producto_id == producto_id).count()
    if en_uso:
        raise HTTPException(
            status_code=409,
            detail=f"Hay {en_uso} pedido(s) sin cobrar con este producto. Cobra o elimina esos pedidos primero, o desactivalo en vez de borrarlo.",
        )
    db.delete(p)
    db.commit()
    return {"ok": True}
