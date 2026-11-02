"""Mesas, barras y pedidos."""
from conftest import pedir


class TestMesas:
    def test_seed_6_mesas_y_5_barras_ordenadas(self, client):
        mesas = client.get("/api/mesas").json()
        assert [m["numero"] for m in mesas] == [1, 2, 3, 4, 5, 6, 101, 102, 103, 104, 105]
        assert [m["tipo"] for m in mesas].count("barra") == 5
        assert all(m["estado"] == "disponible" for m in mesas)

    def test_filtro_por_tipo(self, client):
        assert len(client.get("/api/mesas?tipo=barra").json()) == 5

    def test_numero_duplicado_es_409(self, client):
        r = client.post("/api/mesas?numero=1&capacidad=4")
        assert r.status_code == 409

    def test_estado_invalido_es_422(self, client, mesa):
        # Antes cualquier string se grababa y dejaba la fila ilegible (500 eterno).
        assert client.put(f"/api/mesas/{mesa}?estado=rota").status_code == 422

    def test_mesa_inexistente_404(self, client):
        assert client.get("/api/mesas/9999").status_code == 404

    def test_cuenta_abierta_en_tarjeta(self, client, mesa, producto):
        pid, precio = producto
        pedir(client, mesa, pid, 3)
        m = next(m for m in client.get("/api/mesas").json() if m["id"] == mesa)
        assert m["estado"] == "ocupada"
        assert m["platillos"] == 3
        assert m["total_abierto"] == round(precio * 3, 2)
        assert m["abierta_desde"].endswith("Z")


class TestPedidos:
    def test_pedido_ocupa_la_mesa(self, client, mesa, producto):
        pedir(client, mesa, producto[0])
        assert client.get(f"/api/mesas/{mesa}").json()["estado"] == "ocupada"

    def test_producto_normal_ignora_precio_del_cliente(self, client, mesa, producto):
        pid, precio = producto
        pedir(client, mesa, pid, precio_unitario=0.01, nombre_personalizado="Gratis")
        p = client.get(f"/api/pedidos/mesa/{mesa}").json()["pedidos"][0]
        assert p["precio_unitario"] == precio
        assert p["producto_nombre"] != "Gratis"

    def test_producto_libre_acepta_nombre_y_precio(self, client, mesa, producto_libre):
        pedir(client, mesa, producto_libre, 2, precio_unitario=45.5, nombre_personalizado="  Agua de horchata ")
        r = client.get(f"/api/pedidos/mesa/{mesa}").json()
        assert r["pedidos"][0]["producto_nombre"] == "Agua de horchata"
        assert r["total"] == 91.0

    def test_cantidad_cero_o_negativa_es_422(self, client, mesa, producto):
        for cantidad in (0, -1):
            r = client.post("/api/pedidos", json={"mesa_id": mesa, "producto_id": producto[0], "cantidad": cantidad})
            assert r.status_code == 422

    def test_producto_inexistente_404(self, client, mesa):
        r = client.post("/api/pedidos", json={"mesa_id": mesa, "producto_id": 99999, "cantidad": 1})
        assert r.status_code == 404

    def test_editar_producto_no_editable_es_400(self, client, mesa, producto):
        pid = pedir(client, mesa, producto[0])
        r = client.put(f"/api/pedidos/pedido/{pid}/editar", json={"precio_unitario": 1})
        assert r.status_code == 400

    def test_editar_producto_libre(self, client, mesa, producto_libre):
        pid = pedir(client, mesa, producto_libre, precio_unitario=10)
        assert client.put(f"/api/pedidos/pedido/{pid}/editar",
                          json={"precio_unitario": 25, "nombre_personalizado": "Tamal"}).status_code == 200
        p = client.get(f"/api/pedidos/mesa/{mesa}").json()["pedidos"][0]
        assert (p["producto_nombre"], p["precio_unitario"]) == ("Tamal", 25)

    def test_cantidad_cero_borra_la_linea(self, client, mesa, producto):
        pid = pedir(client, mesa, producto[0], 2)
        client.put(f"/api/pedidos/pedido/{pid}?cantidad=0")
        assert client.get(f"/api/pedidos/mesa/{mesa}").json()["pedidos"] == []

    def test_eliminar_pedido(self, client, mesa, producto):
        pid = pedir(client, mesa, producto[0])
        assert client.delete(f"/api/pedidos/pedido/{pid}").status_code == 200
        assert client.delete(f"/api/pedidos/pedido/{pid}").status_code == 404


class TestComensales:
    def test_comensal_ocupa_barra_y_borrar_ultimo_la_libera(self, client, barras, producto):
        b = barras[0]
        c = client.post("/api/comensales", json={"barra_id": b, "nombre": "Juan"}).json()
        assert client.get(f"/api/mesas/{b}").json()["estado"] == "ocupada"
        client.post("/api/pedidos", json={"comensal_id": c["id"], "producto_id": producto[0], "cantidad": 1})

        r = client.delete(f"/api/comensales/{c['id']}").json()
        assert r["pedidos_borrados"] == 1
        assert client.get(f"/api/mesas/{b}").json()["estado"] == "disponible"

    def test_nombre_en_blanco_es_422(self, client, barras):
        r = client.post("/api/comensales", json={"barra_id": barras[0], "nombre": "   "})
        assert r.status_code == 422

    def test_lista_con_cuenta(self, client, barras, producto):
        pid, precio = producto
        c = client.post("/api/comensales", json={"barra_id": barras[0], "nombre": "Ana"}).json()
        client.post("/api/pedidos", json={"comensal_id": c["id"], "producto_id": pid, "cantidad": 2})
        lista = client.get(f"/api/comensales/barra/{barras[0]}").json()
        assert lista == [{"id": c["id"], "nombre": "Ana", "total": round(precio * 2, 2), "platillos": 2}]
