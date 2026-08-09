from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
import enum

from tz import ahora_utc

Base = declarative_base()

class EstadoMesa(str, enum.Enum):
    DISPONIBLE = "disponible"
    OCUPADA = "ocupada"

class EstadoPedido(str, enum.Enum):
    PENDIENTE = "pendiente"

class EstadoCobro(str, enum.Enum):
    COMPLETADO = "completado"

class Mesa(Base):
    __tablename__ = "mesas"
    id = Column(Integer, primary_key=True, index=True)
    numero = Column(Integer, unique=True)
    capacidad = Column(Integer)
    tipo = Column(String, default="mesa")
    estado = Column(Enum(EstadoMesa), default=EstadoMesa.DISPONIBLE)
    creado_en = Column(DateTime, default=ahora_utc)

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    categoria = Column(String)
    precio = Column(Float)
    icono = Column(String, nullable=True)
    activo = Column(Integer, default=1)
    # 1 = al agregarlo se pide nombre y precio para ESA linea (producto libre).
    # El catalogo no cambia: la personalizacion vive en el pedido/item.
    editable = Column(Integer, default=0)

class Comensal(Base):
    __tablename__ = "comensales"
    id = Column(Integer, primary_key=True, index=True)
    mesa_id = Column(Integer, ForeignKey("mesas.id"))
    nombre = Column(String)
    activo = Column(Integer, default=1)
    creado_en = Column(DateTime, default=ahora_utc)

class Pedido(Base):
    __tablename__ = "pedidos"
    id = Column(Integer, primary_key=True, index=True)
    mesa_id = Column(Integer, ForeignKey("mesas.id"), nullable=True)
    comensal_id = Column(Integer, ForeignKey("comensales.id"), nullable=True)
    producto_id = Column(Integer, ForeignKey("productos.id"))
    cantidad = Column(Integer)
    precio_unitario = Column(Float)
    # Si viene, sustituye al nombre del catalogo solo en esta linea.
    nombre_personalizado = Column(String, nullable=True)
    estado = Column(Enum(EstadoPedido), default=EstadoPedido.PENDIENTE)
    creado_en = Column(DateTime, default=ahora_utc)

class Cobro(Base):
    __tablename__ = "cobros"
    id = Column(Integer, primary_key=True, index=True)
    mesa_id = Column(Integer, ForeignKey("mesas.id"), nullable=True)
    comensal_id = Column(Integer, ForeignKey("comensales.id"), nullable=True)
    total = Column(Float)
    metodo_pago = Column(String)
    # Tarjeta: codigo de autorizacion de la terminal (para cuadrar el corte).
    codigo_cobro = Column(String, nullable=True)
    # Efectivo: con cuanto pago el cliente. El cambio = monto_recibido - total.
    monto_recibido = Column(Float, nullable=True)
    estado = Column(Enum(EstadoCobro), default=EstadoCobro.COMPLETADO)
    fecha_hora = Column(DateTime, default=ahora_utc)
    # NULL = pendiente de corte. Con valor = ya quedo dentro de ese cierre.
    cierre_id = Column(Integer, ForeignKey("cierres_caja.id"), nullable=True, index=True)

class Gasto(Base):
    __tablename__ = "gastos"
    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String)
    monto = Column(Float)
    fecha_hora = Column(DateTime, default=ahora_utc)
    cierre_id = Column(Integer, ForeignKey("cierres_caja.id"), nullable=True, index=True)

class OrdenLlevar(Base):
    __tablename__ = "ordenes_llevar"
    id = Column(Integer, primary_key=True, index=True)
    total = Column(Float)
    metodo_pago = Column(String)
    codigo_cobro = Column(String, nullable=True)
    monto_recibido = Column(Float, nullable=True)
    fecha_hora = Column(DateTime, default=ahora_utc)
    cierre_id = Column(Integer, ForeignKey("cierres_caja.id"), nullable=True, index=True)

class OrdenLlevarItem(Base):
    __tablename__ = "ordenes_llevar_items"
    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(Integer, ForeignKey("ordenes_llevar.id"))
    producto_nombre = Column(String)
    cantidad = Column(Integer)
    precio_unitario = Column(Float)

class Ticket(Base):
    """Comprobante de una venta ya cobrada, sea de mesa, barra o para llevar.

    Folio unico para las tres: antes cobros.id y ordenes_llevar.id corrian por
    separado, asi que dos ventas distintas podian imprimirse ambas como "#5" y
    no habia forma de saber a cual se referia un ticket en la mano.

    Guarda el TOTAL y el metodo ya calculados; las lineas viven en TicketItem.
    """
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)   # el folio impreso
    origen = Column(String, index=True)                  # mesa | barra | llevar
    subtitulo = Column(String)                           # "Mesa #5", "Barra 2 - Juan", "Para Llevar"
    total = Column(Float)
    metodo_pago = Column(String)
    codigo_cobro = Column(String, nullable=True)
    monto_recibido = Column(Float, nullable=True)
    cambio = Column(Float, nullable=True)
    # Trazabilidad hacia la venta que lo origino (para cuadrar contra el corte).
    cobro_id = Column(Integer, ForeignKey("cobros.id"), nullable=True)
    orden_llevar_id = Column(Integer, ForeignKey("ordenes_llevar.id"), nullable=True)
    fecha_hora = Column(DateTime, default=ahora_utc, index=True)

class TicketItem(Base):
    """Linea del ticket. Copia (snapshot) del nombre y precio al momento de la
    venta: NO es FK a productos a proposito. El catalogo se edita en produccion
    desde la pantalla Productos, y un ticket reimpreso debe mostrar lo que se
    vendio ese dia, no el nombre/precio que tenga el producto hoy."""
    __tablename__ = "ticket_items"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), index=True)
    nombre = Column(String)
    cantidad = Column(Integer)
    precio_unitario = Column(Float)
    subtotal = Column(Float)

class CierreCaja(Base):
    __tablename__ = "cierres_caja"
    # Un solo cierre por dia: evita cortes duplicados por doble click.
    __table_args__ = (UniqueConstraint("fecha", name="uq_cierre_fecha"),)
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(String, index=True)          # YYYY-MM-DD del corte (hora local)
    ingresos = Column(Float)
    gastos = Column(Float)
    efectivo_bruto = Column(Float)
    efectivo_neto = Column(Float)               # efectivo - gastos
    tarjeta = Column(Float)                      # informativo
    neto = Column(Float)
    creado_en = Column(DateTime, default=ahora_utc)
