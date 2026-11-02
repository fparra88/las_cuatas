"""Reglas puras compartidas: pagos.resolver_pago y tz.py."""
from datetime import date, datetime

import pytest
from fastapi import HTTPException

from pagos import resolver_pago
from tz import iso_utc, parse_fecha, rango_dia_utc


class TestResolverPago:
    def test_tarjeta_exige_codigo(self):
        with pytest.raises(HTTPException) as e:
            resolver_pago("tarjeta", None, None, 100)
        assert e.value.status_code == 422

    def test_tarjeta_codigo_en_blanco_no_cuenta(self):
        with pytest.raises(HTTPException):
            resolver_pago("tarjeta", "   ", None, 100)

    def test_tarjeta_limpia_codigo_e_ignora_efectivo(self):
        assert resolver_pago("tarjeta", " 1234 ", 500, 100) == ("1234", None, None)

    def test_efectivo_sin_monto_es_valido(self):
        assert resolver_pago("efectivo", None, None, 100) == (None, None, None)

    def test_efectivo_calcula_cambio(self):
        assert resolver_pago("efectivo", None, 200, 135.5) == (None, 200, 64.5)

    def test_efectivo_exacto(self):
        assert resolver_pago("efectivo", None, 100, 100) == (None, 100, 0)

    def test_efectivo_que_no_cubre_es_422(self):
        with pytest.raises(HTTPException) as e:
            resolver_pago("efectivo", None, 99.99, 100)
        assert e.value.status_code == 422
        assert "no cubre" in e.value.detail


class TestZonaHoraria:
    def test_rango_es_medianoche_local_en_utc(self):
        # Guadalajara UTC-6: el dia local empieza a las 06:00Z.
        d, ini, fin = rango_dia_utc("2026-07-29")
        assert d == date(2026, 7, 29)
        assert ini == datetime(2026, 7, 29, 6, 0)
        assert fin == datetime(2026, 7, 30, 6, 0)

    def test_fecha_invalida_es_422_no_500(self):
        with pytest.raises(HTTPException) as e:
            parse_fecha("29/07/2026")
        assert e.value.status_code == 422

    def test_iso_utc_lleva_z(self):
        # Sin la Z el navegador lee el UTC como hora local y descuadra 6 h.
        assert iso_utc(datetime(2026, 1, 2, 3, 4, 5)) == "2026-01-02T03:04:05Z"
        assert iso_utc(None) is None
