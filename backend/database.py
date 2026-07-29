import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session

load_dotenv()

# Postgres en prod (EasyPanel), SQLite como fallback local.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./las_cuatas.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # pool_pre_ping evita conexiones muertas tras idle en Postgres.
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columnas agregadas despues de que la tabla ya existia en produccion.
# create_all() solo crea tablas nuevas, nunca altera las existentes, y el
# proyecto no usa Alembic. Se aplican con ADD COLUMN (soportado igual por
# SQLite y Postgres) y se omiten si ya estan.
_COLUMNAS_NUEVAS = [
    ("pedidos", "nombre_personalizado", "VARCHAR"),
    ("productos", "editable", "INTEGER DEFAULT 0"),
]


def _migrar():
    inspector = inspect(engine)
    tablas = set(inspector.get_table_names())
    with engine.begin() as conn:
        for tabla, columna, tipo in _COLUMNAS_NUEVAS:
            if tabla not in tablas:
                continue
            existentes = {c["name"] for c in inspector.get_columns(tabla)}
            if columna in existentes:
                continue
            conn.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {columna} {tipo}"))


def init_db():
    from models import Base
    Base.metadata.create_all(bind=engine)
    _migrar()
