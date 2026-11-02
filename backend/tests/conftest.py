"""Fixtures compartidas.

Cada test corre contra una base SQLite nueva en un directorio temporal: nunca
toca las_cuatas.db ni el Postgres de produccion. DATABASE_URL se fija ANTES de
importar `database`, porque el engine se crea al importar el modulo.

Correr desde backend/ (los imports son absolutos):  python -m pytest
"""
import os
import sys
import tempfile
from pathlib import Path

_TMP = tempfile.mkdtemp(prefix="las_cuatas_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TMP, 'test.db').as_posix()}"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from database import SessionLocal, engine
from models import Base, Mesa, Producto, GastoFijo
from seed_data import run_seed
from tz import hoy_local
import main


@pytest.fixture
def client():
    """App con base recien sembrada (6 mesas, 5 barras, catalogo, Renta/Sueldos en 0).

    Sin `with TestClient(...)`: el startup volveria a correr run_seed, y aqui
    ya se siembra a mano.
    """
    Base.metadata.drop_all(bind=engine)
    run_seed()
    return TestClient(main.app)


@pytest.fixture
def db(client):
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture
def hoy():
    return hoy_local().isoformat()


@pytest.fixture
def mesa(db):
    """Mesa 1."""
    return db.query(Mesa).filter(Mesa.tipo == "mesa").order_by(Mesa.numero).first().id


@pytest.fixture
def barras(db):
    return [m.id for m in db.query(Mesa).filter(Mesa.tipo == "barra").order_by(Mesa.numero)]


@pytest.fixture
def producto(db):
    """Un platillo normal (no editable) del catalogo: (id, precio)."""
    p = db.query(Producto).filter(Producto.editable == 0, Producto.precio > 0).order_by(Producto.id).first()
    return p.id, p.precio


@pytest.fixture
def producto_libre(db):
    return db.query(Producto).filter(Producto.nombre == "Producto Libre").one().id


@pytest.fixture
def fijos(db):
    """{'Renta': id, 'Sueldos': id}"""
    return {f.nombre: f.id for f in db.query(GastoFijo).all()}


def pedir(client, mesa_id, producto_id, cantidad=1, **extra):
    r = client.post("/api/pedidos", json={"mesa_id": mesa_id, "producto_id": producto_id,
                                          "cantidad": cantidad, **extra})
    assert r.status_code == 200, r.text
    return r.json()["id"]
