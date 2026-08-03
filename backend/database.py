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
    # Marca a que cierre de caja pertenece la fila. NULL = pendiente de corte.
    ("cobros", "cierre_id", "INTEGER"),
    ("cobros", "codigo_cobro", "VARCHAR"),
    ("cobros", "monto_recibido", "FLOAT"),
    ("gastos", "cierre_id", "INTEGER"),
    ("ordenes_llevar", "cierre_id", "INTEGER"),
    ("ordenes_llevar", "codigo_cobro", "VARCHAR"),
    ("ordenes_llevar", "monto_recibido", "FLOAT"),
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

        # UNIQUE(fecha) en cierres_caja: create_all() no lo agrega a una tabla que
        # ya existia. Si ya hay cortes duplicados de antes, se omite y se avisa;
        # el chequeo en efectuar_corte igual bloquea los nuevos.
        if "cierres_caja" in tablas:
            dupes = conn.execute(text(
                "SELECT COUNT(*) FROM (SELECT fecha FROM cierres_caja "
                "GROUP BY fecha HAVING COUNT(*) > 1) d"
            )).scalar()
            if dupes:
                print(f"[migracion] {dupes} fecha(s) con cierres duplicados; "
                      "no se crea uq_cierre_fecha. Limpia cierres_caja a mano.")
            else:
                conn.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_cierre_fecha ON cierres_caja (fecha)"
                ))

        # El seed viejo creaba 100 mesas (numero 7-100 nunca fueron mesas reales,
        # el negocio tiene 6). Se limpian las que quedaron huerfanas de esa epoca:
        # disponibles, sin pedidos ni cobros. Si alguna esta ocupada o tiene
        # historial, se deja (mejor una mesa fantasma que borrar datos).
        if {"mesas", "pedidos", "cobros"} <= tablas:
            # El Enum de SQLAlchemy guarda el NOMBRE del miembro ('DISPONIBLE'),
            # no el value ('disponible') -- asi esta la columna real en la BD.
            borradas = conn.execute(text("""
                DELETE FROM mesas WHERE tipo = 'mesa' AND numero > 6
                  AND estado = 'DISPONIBLE'
                  AND id NOT IN (SELECT DISTINCT mesa_id FROM pedidos WHERE mesa_id IS NOT NULL)
                  AND id NOT IN (SELECT DISTINCT mesa_id FROM cobros WHERE mesa_id IS NOT NULL)
            """)).rowcount
            if borradas:
                print(f"[migracion] {borradas} mesa(s) fantasma (numero > 6, del seed viejo de 100) eliminadas.")


def init_db():
    from models import Base
    Base.metadata.create_all(bind=engine)
    _migrar()
