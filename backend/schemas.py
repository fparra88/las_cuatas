from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional, List

# El corte solo desglosa efectivo y tarjeta: cualquier otro valor desaparecia
# del desglose aunque si sumaba a los ingresos.
MetodoPago = Literal["efectivo", "tarjeta"]

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
    # gt=0: una cantidad negativa daba un total negativo que restaba del corte.
    cantidad: int = Field(gt=0, le=999)
    # Solo para productos editables: sobrescriben nombre/precio de ESA linea.
    nombre_personalizado: Optional[str] = None
    precio_unitario: Optional[float] = Field(default=None, ge=0)

class PedidoEditar(BaseModel):
    nombre_personalizado: Optional[str] = None
    precio_unitario: Optional[float] = Field(default=None, ge=0)

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
    metodo_pago: MetodoPago
    # Tarjeta: obligatorio. Codigo de autorizacion de la terminal.
    codigo_cobro: Optional[str] = Field(default=None, max_length=50)
    # Efectivo: opcional. Si viene, debe alcanzar para cubrir el total.
    monto_recibido: Optional[float] = Field(default=None, ge=0)

class TicketGenerado(BaseModel):
    id: int
    numero_mesa: int
    total: float
    metodo_pago: str
    fecha_hora: datetime
    pedidos: List[dict]
    codigo_cobro: Optional[str] = None
    monto_recibido: Optional[float] = None
    cambio: Optional[float] = None
