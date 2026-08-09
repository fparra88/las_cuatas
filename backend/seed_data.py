from database import SessionLocal, init_db
from models import Mesa, Producto

productos = [
    # GUISADOS
    {"nombre": "Guisados Lto", "categoria": "Guisados", "precio": 200.00, "icono": "🍲"},
    {"nombre": "Guisados 1/2", "categoria": "Guisados", "precio": 100.00, "icono": "🍲"},
    {"nombre": "Guisados 1/4", "categoria": "Guisados", "precio": 50.00, "icono": "🍲"},

    # ARROZ
    {"nombre": "Arroz Lto", "categoria": "Arroz", "precio": 50.00, "icono": "🍚"},
    {"nombre": "Arroz 1/2", "categoria": "Arroz", "precio": 25.00, "icono": "🍚"},
    {"nombre": "Arroz 1/4", "categoria": "Arroz", "precio": 15.00, "icono": "🍚"},

    # FRIJOL
    {"nombre": "Frijol Lto", "categoria": "Frijol", "precio": 50.00, "icono": "🫘"},
    {"nombre": "Frijol 1/2", "categoria": "Frijol", "precio": 25.00, "icono": "🫘"},
    {"nombre": "Frijol 1/4", "categoria": "Frijol", "precio": 15.00, "icono": "🫘"},

    # VERDURAS
    {"nombre": "Verduras Charola Grande", "categoria": "Verduras", "precio": 50.00, "icono": "🥦"},
    {"nombre": "Verduras Charola Chica", "categoria": "Verduras", "precio": 25.00, "icono": "🥦"},

    # SPAGHETTI / PAPAS / CHILAQUILES / NOPALES
    {"nombre": "Spaghetti/Papas con chorizo/Chilaquiles/Nopales Lto", "categoria": "Platillos", "precio": 100.00, "icono": "🍝"},
    {"nombre": "Spaghetti/Papas con chorizo/Chilaquiles/Nopales 1/2", "categoria": "Platillos", "precio": 50.00, "icono": "🍝"},
    {"nombre": "Spaghetti/Papas con chorizo/Chilaquiles/Nopales 1/4", "categoria": "Platillos", "precio": 25.00, "icono": "🍝"},

    # LONCHES
    {"nombre": "Lonche Frijol", "categoria": "Lonches", "precio": 40.00, "icono": "🥖"},
    {"nombre": "Lonche Frijol c/Queso", "categoria": "Lonches", "precio": 45.00, "icono": "🥖"},
    {"nombre": "Lonche Chilaquiles", "categoria": "Lonches", "precio": 50.00, "icono": "🥖"},
    {"nombre": "Lonche Jamón", "categoria": "Lonches", "precio": 50.00, "icono": "🥖"},
    {"nombre": "Lonche Panela", "categoria": "Lonches", "precio": 50.00, "icono": "🥖"},
    {"nombre": "Lonche Combinado", "categoria": "Lonches", "precio": 55.00, "icono": "🥖"},
    {"nombre": "Lonche Guisado", "categoria": "Lonches", "precio": 55.00, "icono": "🥖"},
    {"nombre": "Lonche Milanesa", "categoria": "Lonches", "precio": 70.00, "icono": "🥖"},
    {"nombre": "Lonche Pollo a la Plancha", "categoria": "Lonches", "precio": 65.00, "icono": "🥖"},

    # TACOS
    {"nombre": "Taco Máquina", "categoria": "Tacos", "precio": 18.00, "icono": "🌮"},
    {"nombre": "Taco a Mano", "categoria": "Tacos", "precio": 20.00, "icono": "🌮"},

    # QUESADILLAS
    {"nombre": "Quesadilla Sencilla Máquina", "categoria": "Quesadillas", "precio": 18.00, "icono": "🫓"},
    {"nombre": "Quesadilla Sencilla a Mano", "categoria": "Quesadillas", "precio": 20.00, "icono": "🫓"},
    {"nombre": "Quesadilla con Guisado Máquina", "categoria": "Quesadillas", "precio": 28.00, "icono": "🫓"},
    {"nombre": "Quesadilla con Guisado a Mano", "categoria": "Quesadillas", "precio": 30.00, "icono": "🫓"},

    # HOT CAKES Y MOLLETES
    {"nombre": "Hot Cake", "categoria": "Desayunos", "precio": 25.00, "icono": "🥞"},
    {"nombre": "Mollete", "categoria": "Desayunos", "precio": 30.00, "icono": "🫓"},

    # PARRILLADA
    {"nombre": "Parrillada con Agua (local)", "categoria": "Parrillada", "precio": 130.00, "icono": "🥩"},
    {"nombre": "Parrillada con Agua (para llevar)", "categoria": "Parrillada", "precio": 135.00, "icono": "🥩"},
    {"nombre": "Parrillada sin Agua (local)", "categoria": "Parrillada", "precio": 120.00, "icono": "🥩"},
    {"nombre": "Parrillada sin Agua (para llevar)", "categoria": "Parrillada", "precio": 125.00, "icono": "🥩"},

    # ALAMBRE
    {"nombre": "Alambre con Agua (local)", "categoria": "Alambre", "precio": 120.00, "icono": "🍢"},
    {"nombre": "Alambre con Agua (para llevar)", "categoria": "Alambre", "precio": 125.00, "icono": "🍢"},
    {"nombre": "Alambre sin Agua (local)", "categoria": "Alambre", "precio": 110.00, "icono": "🍢"},
    {"nombre": "Alambre sin Agua (para llevar)", "categoria": "Alambre", "precio": 115.00, "icono": "🍢"},

    # POLLO VEGETARIANO
    {"nombre": "Pollo Vegetariano con Agua (local)", "categoria": "Pollo Vegetariano", "precio": 120.00, "icono": "🥗"},
    {"nombre": "Pollo Vegetariano con Agua (para llevar)", "categoria": "Pollo Vegetariano", "precio": 125.00, "icono": "🥗"},
    {"nombre": "Pollo Vegetariano sin Agua (local)", "categoria": "Pollo Vegetariano", "precio": 110.00, "icono": "🥗"},
    {"nombre": "Pollo Vegetariano sin Agua (para llevar)", "categoria": "Pollo Vegetariano", "precio": 115.00, "icono": "🥗"},

    # SANDWICHES        
    {"nombre": "Sandwich de Jamón", "categoria": "Sandwiches", "precio": 35.00, "icono": "🥪"},
    {"nombre": "Sandwich de Panela", "categoria": "Sandwiches", "precio": 35.00, "icono": "🥪"},
    {"nombre": "Sandwich Combinado", "categoria": "Sandwiches", "precio": 40.00, "icono": "🥪"},
    {"nombre": "Sandwich Pollo a la Plancha", "categoria": "Sandwiches", "precio": 50.00, "icono": "🥪"},
    {"nombre": "Sandwich Milanesa", "categoria": "Sandwiches", "precio": 60.00, "icono": "🥪"},
    
    # COMIDA CORRIDA
    {"nombre": "Comida Corrida Paquete (local)", "categoria": "Comida Corrida", "precio": 105.00, "icono": "🍽️"},
    {"nombre": "Comida Corrida Paquete (para llevar)", "categoria": "Comida Corrida", "precio": 115.00, "icono": "🍽️"},
    {"nombre": "Comida Corrida Solo Platillo (local)", "categoria": "Comida Corrida", "precio": 100.00, "icono": "🍽️"},
    {"nombre": "Comida Corrida Solo Platillo (para llevar)", "categoria": "Comida Corrida", "precio": 110.00, "icono": "🍽️"},

    # CARNE ASADA
    {"nombre": "Carne Asada Paquete (local)", "categoria": "Carne Asada", "precio": 125.00, "icono": "🥩"},
    {"nombre": "Carne Asada Paquete (para llevar)", "categoria": "Carne Asada", "precio": 135.00, "icono": "🥩"},
    {"nombre": "Carne Asada Solo Platillo (local)", "categoria": "Carne Asada", "precio": 120.00, "icono": "🥩"},
    {"nombre": "Carne Asada Solo Platillo (para llevar)", "categoria": "Carne Asada", "precio": 125.00, "icono": "🥩"},

    # POLLO A LA PLANCHA
    {"nombre": "Pollo a la Plancha Paquete (local)", "categoria": "Pollo", "precio": 110.00, "icono": "🍗"},
    {"nombre": "Pollo a la Plancha Paquete (para llevar)", "categoria": "Pollo", "precio": 120.00, "icono": "🍗"},
    {"nombre": "Pollo a la Plancha Solo Platillo (local)", "categoria": "Pollo", "precio": 105.00, "icono": "🍗"},
    {"nombre": "Pollo a la Plancha Solo Platillo (para llevar)", "categoria": "Pollo", "precio": 110.00, "icono": "🍗"},

    # MILANESA DE POLLO Y RES
    {"nombre": "Milanesa de Pollo y Res Paquete (local)", "categoria": "Milanesa", "precio": 120.00, "icono": "🍖"},
    {"nombre": "Milanesa de Pollo y Res Paquete (para llevar)", "categoria": "Milanesa", "precio": 130.00, "icono": "🍖"},
    {"nombre": "Milanesa de Pollo y Res Solo Platillo (local)", "categoria": "Milanesa", "precio": 115.00, "icono": "🍖"},
    {"nombre": "Milanesa de Pollo y Res Solo Platillo (para llevar)", "categoria": "Milanesa", "precio": 120.00, "icono": "🍖"},

    # ENSALADA DE POLLO
    {"nombre": "Ensalada de Pollo con Agua (local)", "categoria": "Ensaladas", "precio": 105.00, "icono": "🥗"},
    {"nombre": "Ensalada de Pollo con Agua (para llevar)", "categoria": "Ensaladas", "precio": 115.00, "icono": "🥗"},
    {"nombre": "Ensalada de Pollo sin Agua (local)", "categoria": "Ensaladas", "precio": 100.00, "icono": "🥗"},
    {"nombre": "Ensalada de Pollo sin Agua (para llevar)", "categoria": "Ensaladas", "precio": 105.00, "icono": "🥗"},

    # TORTA LAS CUATAS
    {"nombre": "Torta las Cuatas (para llevar)", "categoria": "Tortas", "precio": 80.00, "icono": "🥙"},

    # HUEVOS AL GUSTO
    {"nombre": "Huevos al Gusto Paquete (local)", "categoria": "Desayunos", "precio": 80.00, "icono": "🍳"},
    {"nombre": "Huevos al Gusto Paquete (para llevar)", "categoria": "Desayunos", "precio": 90.00, "icono": "🍳"},
    {"nombre": "Huevos al Gusto Solo Platillo (local)", "categoria": "Desayunos", "precio": 75.00, "icono": "🍳"},
    {"nombre": "Huevos al Gusto Solo Platillo (para llevar)", "categoria": "Desayunos", "precio": 80.00, "icono": "🍳"},

    # OMELETTE
    {"nombre": "Omelette Paquete (local)", "categoria": "Desayunos", "precio": 90.00, "icono": "🍳"},
    {"nombre": "Omelette Paquete (para llevar)", "categoria": "Desayunos", "precio": 100.00, "icono": "🍳"},
    {"nombre": "Omelette Solo Platillo (local)", "categoria": "Desayunos", "precio": 85.00, "icono": "🍳"},
    {"nombre": "Omelette Solo Platillo (para llevar)", "categoria": "Desayunos", "precio": 90.00, "icono": "🍳"},

    # ORDEN MOLLETES
    {"nombre": "Orden Molletes Paquete (local)", "categoria": "Desayunos", "precio": 70.00, "icono": "🫓"},
    {"nombre": "Orden Molletes Paquete (para llevar)", "categoria": "Desayunos", "precio": 80.00, "icono": "🫓"},
    {"nombre": "Orden Molletes sin Bebida (local)", "categoria": "Desayunos", "precio": 65.00, "icono": "🫓"},
    {"nombre": "Orden Molletes sin Bebida (para llevar)", "categoria": "Desayunos", "precio": 70.00, "icono": "🫓"},

    # RANCHEROS / DIVORCIADOS
    {"nombre": "Rancheros/Divorciados Paquete (local)", "categoria": "Desayunos", "precio": 90.00, "icono": "🍳"},
    {"nombre": "Rancheros/Divorciados Paquete (para llevar)", "categoria": "Desayunos", "precio": 100.00, "icono": "🍳"},
    {"nombre": "Rancheros/Divorciados Solo Platillo (local)", "categoria": "Desayunos", "precio": 85.00, "icono": "🍳"},
    {"nombre": "Rancheros/Divorciados Solo Platillo (para llevar)", "categoria": "Desayunos", "precio": 90.00, "icono": "🍳"},

    # HOT CAKES (PAQUETE)
    {"nombre": "Hot Cakes Paquete (local)", "categoria": "Desayunos", "precio": 85.00, "icono": "🥞"},
    {"nombre": "Hot Cakes Paquete (para llevar)", "categoria": "Desayunos", "precio": 95.00, "icono": "🥞"},
    {"nombre": "Hot Cakes sin Bebida (local)", "categoria": "Desayunos", "precio": 80.00, "icono": "🥞"},
    {"nombre": "Hot Cakes sin Bebida (para llevar)", "categoria": "Desayunos", "precio": 85.00, "icono": "🥞"},

    # CHAMORRO ADOBADO
    {"nombre": "Chamorro Adobado Paquete (local)", "categoria": "Chamorro", "precio": 125.00, "icono": "🍖"},
    {"nombre": "Chamorro Adobado Paquete (para llevar)", "categoria": "Chamorro", "precio": 135.00, "icono": "🍖"},
    {"nombre": "Chamorro Adobado Solo Platillo (local)", "categoria": "Chamorro", "precio": 120.00, "icono": "🍖"},
    {"nombre": "Chamorro Adobado Solo Platillo (para llevar)", "categoria": "Chamorro", "precio": 125.00, "icono": "🍖"},

    # BEBIDAS CALIENTES
    {"nombre": "Café/Avena/Té Lto", "categoria": "Bebidas", "precio": 50.00, "icono": "☕"},
    {"nombre": "Café/Avena/Té 1/2", "categoria": "Bebidas", "precio": 25.00, "icono": "☕"},
    {"nombre": "Café/Avena/Té 1/4", "categoria": "Bebidas", "precio": 18.00, "icono": "☕"},    

    # AGUAS
    {"nombre": "Agua Lto", "categoria": "Bebidas", "precio": 25.00, "icono": "🥤"},
    {"nombre": "Agua 1/2", "categoria": "Bebidas", "precio": 18.00, "icono": "🥤"},
    {"nombre": "Refresco", "categoria": "Bebidas", "precio": 25.00, "icono": "🥤"},
    {"nombre": "Chocomilk 1/2", "categoria": "Bebidas", "precio": 18.00, "icono": "🥤"},
    {"nombre": "Chocomilk lto", "categoria": "Bebidas", "precio": 25.00, "icono": "🥤"},

    # HAMBURGUESA
    {"nombre": "Hamburguesa (local)", "categoria": "Hamburguesas", "precio": 80.00, "icono": "🍔"},
    {"nombre": "Hamburguesa (para llevar)", "categoria": "Hamburguesas", "precio": 85.00, "icono": "🍔"},
]


PRODUCTO_LIBRE = {
    "nombre": "Producto Libre",
    "categoria": "Otros",
    "precio": 0.00,
    "icono": "✏️",
}


def _asegurar_producto_libre(db):
    """Garantiza que exista el producto especial 'Producto Libre' (para cobrar
    platillos fuera de catalogo). Es lo unico que se toca en cada arranque:
    el resto del menu se administra 100% desde la pantalla Productos
    (POST/PUT/DELETE /api/productos en backend/routers/productos.py), no desde
    este archivo."""
    existe = db.query(Producto).filter(Producto.nombre == PRODUCTO_LIBRE["nombre"]).first()
    if existe:
        if not existe.editable:
            existe.editable = 1
            db.commit()
        return
    db.add(Producto(**PRODUCTO_LIBRE, activo=1, editable=1))
    db.commit()


def run_seed(force=False):
    """Siembra datos iniciales. Mesas y productos se crean SOLO si la tabla
    respectiva esta vacia (primer deploy) o si force=True.

    Antes esto re-sincronizaba `productos` contra la BD en cada arranque; se
    quito porque ahora el catalogo se edita en produccion desde la pantalla
    Productos (Postgres es la fuente de verdad) y esa sincronizacion pisaria
    los cambios hechos ahi. Este archivo ya solo sirve para el arranque en
    frio de una base nueva.
    """
    init_db()
    db = SessionLocal()
    try:
        crear_mesas = force or db.query(Mesa).first() is None
        if crear_mesas:
            db.query(Mesa).delete()
            # 6 mesas fisicas + 5 lugares de barra: numero real del negocio,
            # no un limite de pantalla. Para agregar una mesa despues usa
            # POST /api/mesas, no cambies este rango.
            for i in range(1, 7):
                db.add(Mesa(numero=i, capacidad=4 if i <= 4 else 6, tipo="mesa", estado="disponible"))
            for i in range(1, 6):
                db.add(Mesa(numero=100 + i, capacidad=6, tipo="barra", estado="disponible"))
            db.commit()

        crear_productos = force or db.query(Producto).first() is None
        if crear_productos:
            db.query(Producto).delete()
            for p in productos:
                db.add(Producto(**p, activo=1))
            db.commit()

        _asegurar_producto_libre(db)
        return crear_mesas or crear_productos
    finally:
        db.close()


if __name__ == "__main__":
    # Ejecucion manual: fuerza re-crear mesas y re-sembrar productos desde
    # cero (borra ediciones hechas en la pantalla Productos).
    ok = run_seed(force=True)
    print("Mesas y productos re-sembrados desde el codigo" if ok else "Sin cambios (ya habia datos)")
