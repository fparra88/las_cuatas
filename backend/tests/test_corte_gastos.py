"""Gastos, gastos fijos (Renta/Sueldos) y corte de caja."""
import pytest

from conftest import pedir

# Semana de referencia para gastos fijos: lunes 26 a viernes 30 de octubre 2026.
LUN, MAR, MIE, JUE, VIE, SAB = (f"2026-10-{d}" for d in range(26, 32))
DOM = "2026-11-01"
LUN_SIG = "2026-11-02"


def corte(client, fecha):
    return client.get(f"/api/cobros/corte?fecha={fecha}").json()


def cortar(client, fecha):
    return client.post(f"/api/cobros/efectuar-corte?fecha={fecha}")


@pytest.fixture
def con_fijos(client, fijos):
    """Renta $300/dia y Sueldos $1,200/dia."""
    client.put(f"/api/gastos/fijos/{fijos['Renta']}", json={"monto_diario": 300})
    client.put(f"/api/gastos/fijos/{fijos['Sueldos']}", json={"monto_diario": 1200})


class TestGastos:
    def test_registrar_y_listar_del_dia(self, client, hoy):
        r = client.post("/api/gastos", json={"descripcion": " Hielo ", "monto": 80})
        assert r.status_code == 200 and r.json()["descripcion"] == "Hielo"
        lista = client.get(f"/api/gastos?fecha={hoy}").json()
        assert [(g["descripcion"], g["monto"], g["fijo"]) for g in lista] == [("Hielo", 80, False)]

    @pytest.mark.parametrize("body", [{"descripcion": "   ", "monto": 10},
                                      {"descripcion": "X", "monto": 0},
                                      {"descripcion": "X", "monto": -5}])
    def test_validacion_422(self, client, body):
        assert client.post("/api/gastos", json=body).status_code == 422

    def test_borrar_pendiente(self, client):
        gid = client.post("/api/gastos", json={"descripcion": "Gas", "monto": 300}).json()["id"]
        assert client.delete(f"/api/gastos/{gid}").status_code == 200
        assert client.delete(f"/api/gastos/{gid}").status_code == 404

    def test_fecha_mal_formada_422(self, client):
        assert client.get("/api/gastos?fecha=ayer").status_code == 422


class TestCorte:
    def test_desglose_efectivo_tarjeta_y_gastos(self, client, mesa, producto, hoy):
        pid, precio = producto
        pedir(client, mesa, pid, 2)
        client.post("/api/cobros/generar-ticket", json={"mesa_id": mesa, "metodo_pago": "efectivo"})
        client.post("/api/para-llevar", json={"items": [{"producto_id": pid, "cantidad": 1}],
                                              "metodo_pago": "tarjeta", "codigo_cobro": "1"})
        client.post("/api/gastos", json={"descripcion": "Hielo", "monto": 50})

        c = corte(client, hoy)
        efectivo = round(precio * 2, 2)
        assert c["mesas"] == {"total": efectivo, "cantidad": 1}
        assert c["llevar"] == {"total": precio, "cantidad": 1}
        assert c["ingresos"] == round(efectivo + precio, 2)
        assert c["efectivo"] == {"bruto": efectivo, "neto": round(efectivo - 50, 2)}
        assert c["tarjeta"]["total"] == precio
        assert c["neto"] == round(efectivo + precio - 50, 2)
        assert c["cerrado"] is None

    def test_bloqueado_con_mesa_ocupada(self, client, mesa, producto, hoy):
        pedir(client, mesa, producto[0])
        assert corte(client, hoy)["ocupadas"] == 1
        assert cortar(client, hoy).status_code == 409

    def test_un_solo_corte_por_dia(self, client, hoy):
        assert cortar(client, hoy).status_code == 200
        r = cortar(client, hoy)
        assert r.status_code == 409 and "ya tiene corte" in r.json()["detail"]
        assert corte(client, hoy)["cerrado"] is not None

    def test_cerrar_marca_en_vez_de_borrar(self, client, mesa, producto, hoy):
        pedir(client, mesa, producto[0])
        folio = client.post("/api/cobros/generar-ticket",
                            json={"mesa_id": mesa, "metodo_pago": "efectivo"}).json()["folio"]
        gid = client.post("/api/gastos", json={"descripcion": "Hielo", "monto": 10}).json()["id"]
        cierre_id = cortar(client, hoy).json()["id"]

        assert client.get(f"/api/gastos?fecha={hoy}").json()[0]["cerrado"] is True
        assert client.delete(f"/api/gastos/{gid}").status_code == 409
        # Despues del corte ya no se puede cancelar: el corte impreso quedaria descuadrado.
        assert client.post(f"/api/tickets/{folio}/cancelar", json={"motivo": "x"}).status_code == 409
        detalle = client.get(f"/api/cobros/cierres/{cierre_id}").json()
        assert detalle["cobros"] == 1 and len(detalle["gastos_items"]) == 1
        assert [c["id"] for c in client.get("/api/cobros/cierres").json()] == [cierre_id]

    def test_venta_cancelada_no_suma(self, client, mesa, producto, hoy):
        pid, precio = producto
        pedir(client, mesa, pid)
        folio = client.post("/api/cobros/generar-ticket",
                            json={"mesa_id": mesa, "metodo_pago": "efectivo"}).json()["folio"]
        client.post(f"/api/tickets/{folio}/cancelar", json={"motivo": "Se fue sin comer"})
        c = corte(client, hoy)
        assert c["ingresos"] == 0 and c["efectivo"]["bruto"] == 0
        assert c["cancelados"]["cantidad"] == 1 and c["cancelados"]["total"] == precio

    def test_cierre_inexistente_404(self, client):
        assert client.get("/api/cobros/cierres/999").status_code == 404


class TestGastosFijos:
    def test_seed_renta_y_sueldos_en_cero(self, client):
        fijos = client.get("/api/gastos/fijos").json()["fijos"]
        assert [(f["nombre"], f["monto_diario"]) for f in fijos] == [("Renta", 0), ("Sueldos", 0)]

    def test_editar_monto(self, client, fijos):
        r = client.put(f"/api/gastos/fijos/{fijos['Renta']}", json={"monto_diario": 300})
        assert r.status_code == 200 and r.json()["monto_diario"] == 300
        assert client.put(f"/api/gastos/fijos/{fijos['Renta']}", json={"monto_diario": -1}).status_code == 422
        assert client.put("/api/gastos/fijos/999", json={"monto_diario": 1}).status_code == 404

    def test_en_cero_no_se_aplican(self, client):
        assert corte(client, LUN)["gastos"]["items"] == []

    def test_preview_entre_semana_descuenta(self, client, con_fijos):
        c = corte(client, MIE)
        assert [(g["descripcion"], g["monto"], g["fijo"]) for g in c["gastos"]["items"]] == \
            [("Renta", 300, True), ("Sueldos", 1200, True)]
        assert c["gastos"]["total"] == 1500
        assert c["efectivo"]["neto"] == -1500 and c["neto"] == -1500

    @pytest.mark.parametrize("fecha", [SAB, DOM])
    def test_fin_de_semana_no_aplica(self, client, con_fijos, fecha):
        assert corte(client, fecha)["gastos"]["total"] == 0
        cortar(client, fecha)
        assert client.get(f"/api/gastos?fecha={fecha}").json() == []

    def test_corte_crea_filas_fijas_dentro_del_dia(self, client, con_fijos):
        r = cortar(client, MAR)
        assert r.status_code == 200 and r.json()["cerrado"]["gastos"] == 1500
        filas = client.get(f"/api/gastos?fecha={MAR}").json()
        assert sorted((g["descripcion"], g["monto"], g["fijo"], g["cerrado"]) for g in filas) == \
            [("Renta", 300, True, True), ("Sueldos", 1200, True, True)]
        # Ya aplicados: no se pueden borrar.
        assert client.delete(f"/api/gastos/{filas[0]['id']}").status_code == 409
        # Y no se vuelven a sumar en el preview del dia cerrado.
        assert corte(client, MAR)["gastos"]["total"] == 0

    def test_acumula_lunes_a_viernes_y_lunes_vuelve_a_cero(self, client, con_fijos):
        for i, fecha in enumerate((LUN, MAR, MIE, JUE), start=1):
            cortar(client, fecha)
            s = client.get(f"/api/gastos/fijos?fecha={fecha}").json()["semana"]
            assert s["total"] == 1500 * i and s["dias"] == i

        # Viernes antes del corte: lo de hoy aparece como pendiente.
        s = client.get(f"/api/gastos/fijos?fecha={VIE}").json()["semana"]
        assert (s["total"], s["pendiente_hoy"], s["total_con_hoy"], s["es_viernes"]) == (6000, 1500, 7500, True)
        assert {i["nombre"]: i["total_con_hoy"] for i in s["items"]} == {"Renta": 1500, "Sueldos": 6000}

        assert cortar(client, VIE).json()["semana"]["total_con_hoy"] == 7500
        s = client.get(f"/api/gastos/fijos?fecha={VIE}").json()["semana"]
        assert (s["total"], s["pendiente_hoy"], s["dias"]) == (7500, 0, 5)

        # El fin de semana conserva el saldo de la semana; el lunes arranca en 0.
        assert client.get(f"/api/gastos/fijos?fecha={DOM}").json()["semana"]["total"] == 7500
        s = client.get(f"/api/gastos/fijos?fecha={LUN_SIG}").json()["semana"]
        assert (s["desde"], s["total"], s["pendiente_hoy"]) == (LUN_SIG, 0, 1500)

    def test_dia_sin_corte_no_acumula(self, client, con_fijos):
        cortar(client, LUN)
        cortar(client, MIE)   # martes sin corte
        assert client.get(f"/api/gastos/fijos?fecha={JUE}").json()["semana"]["total"] == 3000

    def test_cambiar_monto_no_altera_cortes_hechos(self, client, con_fijos, fijos):
        cortar(client, LUN)
        client.put(f"/api/gastos/fijos/{fijos['Renta']}", json={"monto_diario": 999})
        assert client.get(f"/api/gastos/fijos?fecha={LUN}").json()["semana"]["total"] == 1500
        assert corte(client, MAR)["gastos"]["total"] == 999 + 1200

    def test_seed_no_pisa_montos_editados(self, client, con_fijos):
        from seed_data import run_seed
        run_seed()
        fijos = client.get("/api/gastos/fijos").json()["fijos"]
        assert [f["monto_diario"] for f in fijos] == [300, 1200]
