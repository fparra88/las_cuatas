from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class Mesa(BaseModel):
    id: int
    numero: int
    capacidad: int
    estado: str
    creado_en: datetime
    class Config:
        from_attributes = True

class Producto(BaseModel):
    id: int
    nombre: str
    categoria: str
    precio: float
    icono: Optional[str] = None
    activo: int
    editable: int = 0
    class Config:
        from_attributes = True

class PedidoCreate(BaseModel):
    mesa_id: Optional[int] = None
    comensal_id: Optional[int] = None
    producto_id: int
    cantidad: int
    # Solo para productos editables: sobrescriben nombre/precio de ESA linea.
    nombre_personalizado: Optional[str] = None
    precio_unitario: Optional[float] = None

class PedidoEditar(BaseModel):
    nombre_personalizado: Optional[str] = None
    precio_unitario: Optional[float] = None

class PedidoDetalle(BaseModel):
    id: int
    producto_nombre: str
    cantidad: int
    precio_unitario: float

class ResumenMesa(BaseModel):
    mesa_id: int
    numero_mesa: int
    pedidos: List[PedidoDetalle]
    total: float
    cantidad_items: int

class CobroCreate(BaseModel):
    mesa_id: int
    metodo_pago: str

class TicketGenerado(BaseModel):
    id: int
    numero_mesa: int
    total: float
    metodo_pago: str
    fecha_hora: datetime
    pedidos: List[dict]
