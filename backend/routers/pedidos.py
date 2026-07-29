from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Pedido, Mesa, Producto, Comensal, EstadoMesa
from schemas import PedidoCreate, PedidoEditar, ResumenMesa, PedidoDetalle

router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])

@router.post("")
def crear_pedido(pedido: PedidoCreate, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == pedido.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Nombre/precio libres solo si el producto del catalogo lo permite; de lo
    # contrario un cliente podria cobrar cualquier platillo a cualquier precio.
    if producto.editable:
        nombre = (pedido.nombre_personalizado or "").strip() or None
        precio = pedido.precio_unitario if pedido.precio_unitario is not None else producto.precio
        if precio < 0:
            raise HTTPException(status_code=400, detail="Precio invalido")
    else:
        nombre = None
        precio = producto.precio

    if pedido.comensal_id:
        comensal = db.query(Comensal).filter(Comensal.id == pedido.comensal_id).first()
        if not comensal:
            raise HTTPException(status_code=404, detail="Comensal no encontrado")
        db_pedido = Pedido(comensal_id=pedido.comensal_id, producto_id=pedido.producto_id, cantidad=pedido.cantidad, precio_unitario=precio, nombre_personalizado=nombre)
    else:
        mesa = db.query(Mesa).filter(Mesa.id == pedido.mesa_id).first()
        if not mesa:
            raise HTTPException(status_code=404)
        if mesa.estado == EstadoMesa.DISPONIBLE:
            mesa.estado = EstadoMesa.OCUPADA
        db_pedido = Pedido(mesa_id=pedido.mesa_id, producto_id=pedido.producto_id, cantidad=pedido.cantidad, precio_unitario=precio, nombre_personalizado=nombre)

    db.add(db_pedido)
    db.commit()
    return {"id": db_pedido.id}

@router.get("/mesa/{mesa_id}")
def obtener_pedidos(mesa_id: int, db: Session = Depends(get_db)):
    mesa = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not mesa:
        raise HTTPException(status_code=404)
    pedidos = db.query(Pedido, Producto.nombre).join(Producto, Pedido.producto_id == Producto.id).filter(Pedido.mesa_id == mesa_id).all()
    total = sum(p[0].cantidad * p[0].precio_unitario for p in pedidos)
    cantidad = sum(p[0].cantidad for p in pedidos)
    return ResumenMesa(mesa_id=mesa_id, numero_mesa=mesa.numero, pedidos=[PedidoDetalle(id=p[0].id, producto_nombre=p[0].nombre_personalizado or p[1], cantidad=p[0].cantidad, precio_unitario=p[0].precio_unitario) for p in pedidos], total=total, cantidad_items=cantidad)

@router.get("/comensal/{comensal_id}")
def obtener_pedidos_comensal(comensal_id: int, db: Session = Depends(get_db)):
    comensal = db.query(Comensal).filter(Comensal.id == comensal_id).first()
    if not comensal:
        raise HTTPException(status_code=404)
    pedidos = db.query(Pedido, Producto.nombre).join(Producto, Pedido.producto_id == Producto.id).filter(Pedido.comensal_id == comensal_id).all()
    total = sum(p[0].cantidad * p[0].precio_unitario for p in pedidos)
    return {
        "comensal_id": comensal_id,
        "nombre": comensal.nombre,
        "pedidos": [PedidoDetalle(id=p[0].id, producto_nombre=p[0].nombre_personalizado or p[1], cantidad=p[0].cantidad, precio_unitario=p[0].precio_unitario) for p in pedidos],
        "total": total
    }

@router.delete("/pedido/{pedido_id}")
def eliminar_pedido(pedido_id: int, db: Session = Depends(get_db)):
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404)
    db.delete(p)
    db.commit()
    return {"ok": True}

@router.put("/pedido/{pedido_id}/editar")
def editar_pedido(pedido_id: int, datos: PedidoEditar, db: Session = Depends(get_db)):
    """Corrige nombre y/o precio de una linea ya agregada (solo producto editable)."""
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404)
    producto = db.query(Producto).filter(Producto.id == p.producto_id).first()
    if not producto or not producto.editable:
        raise HTTPException(status_code=400, detail="Este producto no es editable")
    if datos.nombre_personalizado is not None:
        p.nombre_personalizado = datos.nombre_personalizado.strip() or None
    if datos.precio_unitario is not None:
        if datos.precio_unitario < 0:
            raise HTTPException(status_code=400, detail="Precio invalido")
        p.precio_unitario = datos.precio_unitario
    db.commit()
    return {"ok": True}

@router.put("/pedido/{pedido_id}")
def actualizar_cantidad(pedido_id: int, cantidad: int, db: Session = Depends(get_db)):
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404)
    if cantidad <= 0:
        db.delete(p)
    else:
        p.cantidad = cantidad
    db.commit()
    return {"ok": True}
