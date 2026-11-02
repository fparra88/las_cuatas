"""Catalogo editable en produccion."""
from conftest import pedir


def test_crear_y_listar(client):
    r = client.post("/api/productos", json={"nombre": " Tostada ", "categoria": "Antojitos", "precio": 35})
    assert r.status_code == 200 and r.json()["nombre"] == "Tostada"
    assert any(p["nombre"] == "Tostada" for p in client.get("/api/productos?categoria=Antojitos").json())


def test_nombre_duplicado_es_409(client):
    client.post("/api/productos", json={"nombre": "Tostada", "categoria": "A", "precio": 1})
    assert client.post("/api/productos", json={"nombre": "Tostada", "categoria": "A", "precio": 1}).status_code == 409


def test_nombre_en_blanco_es_422(client):
    # Field(min_length=1) acepta '   '; lo frena el .strip() a mano.
    assert client.post("/api/productos", json={"nombre": "   ", "categoria": "A", "precio": 1}).status_code == 422


def test_precio_negativo_es_422(client):
    assert client.post("/api/productos", json={"nombre": "X", "categoria": "A", "precio": -1}).status_code == 422


def test_desactivado_no_sale_en_el_menu(client, producto):
    pid = producto[0]
    client.put(f"/api/productos/{pid}", json={"activo": False})
    assert pid not in [p["id"] for p in client.get("/api/productos").json()]
    assert pid in [p["id"] for p in client.get("/api/productos?todos=true").json()]


def test_no_se_borra_si_hay_pedido_abierto(client, mesa, producto):
    pid = producto[0]
    pedir(client, mesa, pid)
    assert client.delete(f"/api/productos/{pid}").status_code == 409


def test_borrar_libre(client):
    pid = client.post("/api/productos", json={"nombre": "Temporal", "categoria": "A", "precio": 1}).json()["id"]
    assert client.delete(f"/api/productos/{pid}").status_code == 200
    assert client.delete(f"/api/productos/{pid}").status_code == 404


def test_producto_libre_existe_y_es_editable(client):
    libres = [p for p in client.get("/api/productos").json() if p["nombre"] == "Producto Libre"]
    assert len(libres) == 1 and libres[0]["editable"] == 1
