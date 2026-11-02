"""Cobro de mesa, barra y para llevar; tickets (folio unico, reimpresion, cancelacion)."""
from conftest import pedir


def cobrar_mesa(client, mesa, **pago):
    return client.post("/api/cobros/generar-ticket", json={"mesa_id": mesa, **pago})


class TestCobroMesa:
    def test_efectivo_con_cambio_libera_mesa_y_borra_pedidos(self, client, mesa, producto):
        pid, precio = producto
        pedir(client, mesa, pid, 2)
        total = round(precio * 2, 2)
        r = cobrar_mesa(client, mesa, metodo_pago="efectivo", monto_recibido=total + 50)
        assert r.status_code == 200, r.text
        t = r.json()
        assert (t["total"], t["cambio"]) == (total, 50)
        assert client.get(f"/api/mesas/{mesa}").json()["estado"] == "disponible"
        assert client.get(f"/api/pedidos/mesa/{mesa}").json()["pedidos"] == []

    def test_ticket_guarda_copia_del_detalle(self, client, mesa, producto_libre):
        pedir(client, mesa, producto_libre, 2, precio_unitario=30, nombre_personalizado="Pozole chico")
        folio = cobrar_mesa(client, mesa, metodo_pago="efectivo").json()["folio"]
        t = client.get(f"/api/tickets/{folio}").json()
        assert t["origen"] == "mesa" and t["subtitulo"] == "Mesa #1"
        assert t["items"] == [{"nombre": "Pozole chico", "cantidad": 2, "precio_unitario": 30, "subtotal": 60}]

    def test_ticket_sobrevive_cambios_del_catalogo(self, client, mesa, producto):
        pid, precio = producto
        pedir(client, mesa, pid)
        folio = cobrar_mesa(client, mesa, metodo_pago="efectivo").json()["folio"]
        client.put(f"/api/productos/{pid}", json={"nombre": "Renombrado", "precio": precio + 100})
        item = client.get(f"/api/tickets/{folio}").json()["items"][0]
        assert item["nombre"] != "Renombrado" and item["precio_unitario"] == precio

    def test_tarjeta_sin_codigo_no_cobra(self, client, mesa, producto):
        pedir(client, mesa, producto[0])
        assert cobrar_mesa(client, mesa, metodo_pago="tarjeta").status_code == 422
        # La mesa sigue abierta: no se perdio la cuenta.
        assert client.get(f"/api/pedidos/mesa/{mesa}").json()["pedidos"]

    def test_efectivo_que_no_cubre_no_cobra(self, client, mesa, producto):
        pedir(client, mesa, producto[0])
        assert cobrar_mesa(client, mesa, metodo_pago="efectivo", monto_recibido=0.01).status_code == 422

    def test_metodo_desconocido_es_422(self, client, mesa, producto):
        pedir(client, mesa, producto[0])
        assert cobrar_mesa(client, mesa, metodo_pago="transferencia").status_code == 422

    def test_mesa_sin_pedidos_es_400(self, client, mesa):
        assert cobrar_mesa(client, mesa, metodo_pago="efectivo").status_code == 400


class TestCobroBarra:
    def test_cobra_por_comensal_y_numera_por_posicion(self, client, barras, producto):
        b2 = barras[1]   # numero 102 en BD, "Barra 2" para el cajero
        juan = client.post("/api/comensales", json={"barra_id": b2, "nombre": "Juan"}).json()["id"]
        ana = client.post("/api/comensales", json={"barra_id": b2, "nombre": "Ana"}).json()["id"]
        for c in (juan, ana):
            client.post("/api/pedidos", json={"comensal_id": c, "producto_id": producto[0], "cantidad": 1})

        r = client.post(f"/api/cobros/cobrar-comensal?comensal_id={juan}&metodo_pago=tarjeta&codigo_cobro=777")
        assert r.status_code == 200, r.text
        t = client.get(f"/api/tickets/{r.json()['folio']}").json()
        assert t["subtitulo"] == "Barra 2 - Juan" and t["codigo_cobro"] == "777"
        # Ana sigue: la barra no se libera hasta cobrar al ultimo.
        assert client.get(f"/api/mesas/{b2}").json()["estado"] == "ocupada"

        client.post(f"/api/cobros/cobrar-comensal?comensal_id={ana}&metodo_pago=efectivo")
        assert client.get(f"/api/mesas/{b2}").json()["estado"] == "disponible"
        assert client.get(f"/api/comensales/barra/{b2}").json() == []

    def test_comensal_sin_pedidos_es_400(self, client, barras):
        c = client.post("/api/comensales", json={"barra_id": barras[0], "nombre": "X"}).json()["id"]
        assert client.post(f"/api/cobros/cobrar-comensal?comensal_id={c}&metodo_pago=efectivo").status_code == 400


class TestParaLlevar:
    def test_orden_vacia_es_422(self, client):
        assert client.post("/api/para-llevar", json={"items": [], "metodo_pago": "efectivo"}).status_code == 422

    def test_crea_orden_con_ticket(self, client, producto, hoy):
        pid, precio = producto
        r = client.post("/api/para-llevar", json={"items": [{"producto_id": pid, "cantidad": 3}],
                                                  "metodo_pago": "efectivo", "monto_recibido": 1000})
        assert r.status_code == 200, r.text
        o = r.json()
        assert o["total"] == round(precio * 3, 2) and o["cambio"] == round(1000 - precio * 3, 2)
        assert client.get(f"/api/tickets/{o['folio']}").json()["origen"] == "llevar"
        assert len(client.get(f"/api/para-llevar?fecha={hoy}").json()) == 1

    def test_tarjeta_sin_codigo_no_crea_orden(self, client, producto, hoy):
        r = client.post("/api/para-llevar", json={"items": [{"producto_id": producto[0], "cantidad": 1}],
                                                  "metodo_pago": "tarjeta"})
        assert r.status_code == 422
        assert client.get(f"/api/para-llevar?fecha={hoy}").json() == []


class TestTickets:
    def test_folio_unico_entre_origenes(self, client, mesa, barras, producto):
        pid = producto[0]
        pedir(client, mesa, pid)
        f1 = cobrar_mesa(client, mesa, metodo_pago="efectivo").json()["folio"]
        f2 = client.post("/api/para-llevar", json={"items": [{"producto_id": pid, "cantidad": 1}],
                                                   "metodo_pago": "efectivo"}).json()["folio"]
        c = client.post("/api/comensales", json={"barra_id": barras[0], "nombre": "Leo"}).json()["id"]
        client.post("/api/pedidos", json={"comensal_id": c, "producto_id": pid, "cantidad": 1})
        f3 = client.post(f"/api/cobros/cobrar-comensal?comensal_id={c}&metodo_pago=efectivo").json()["folio"]
        assert len({f1, f2, f3}) == 3

    def test_busqueda_por_folio_y_texto(self, client, mesa, producto, hoy):
        pedir(client, mesa, producto[0])
        folio = cobrar_mesa(client, mesa, metodo_pago="efectivo").json()["folio"]
        assert [t["folio"] for t in client.get(f"/api/tickets?q={folio}").json()] == [folio]
        assert len(client.get(f"/api/tickets?fecha={hoy}&q=mesa").json()) == 1
        assert client.get("/api/tickets?q=nadie").json() == []

    def test_cancelar_exige_motivo(self, client, mesa, producto):
        pedir(client, mesa, producto[0])
        folio = cobrar_mesa(client, mesa, metodo_pago="efectivo").json()["folio"]
        assert client.post(f"/api/tickets/{folio}/cancelar", json={"motivo": "   "}).status_code == 422

    def test_cancelar_una_sola_vez(self, client, mesa, producto):
        pedir(client, mesa, producto[0])
        folio = cobrar_mesa(client, mesa, metodo_pago="efectivo").json()["folio"]
        r = client.post(f"/api/tickets/{folio}/cancelar", json={"motivo": "Error de captura"})
        assert r.status_code == 200 and r.json()["cancelado"] is True
        assert client.post(f"/api/tickets/{folio}/cancelar", json={"motivo": "otra"}).status_code == 409

    def test_ticket_inexistente_404(self, client):
        assert client.get("/api/tickets/9999").status_code == 404
