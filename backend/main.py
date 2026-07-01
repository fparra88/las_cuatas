from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import mesas, pedidos, cobros, productos, para_llevar, comensales, gastos

init_db()
app = FastAPI(title="Las Cuatas")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def _seed_if_empty():
    # Seed a runtime (el build no alcanza el Postgres de EasyPanel).
    # Idempotente: no borra datos si ya hay productos.
    from seed_data import run_seed
    run_seed()

# --- Rutas API (/api/*) SIEMPRE antes del catch-all ---
app.include_router(mesas.router)
app.include_router(pedidos.router)
app.include_router(cobros.router)
app.include_router(productos.router)
app.include_router(para_llevar.router)
app.include_router(comensales.router)
app.include_router(gastos.router)


@app.get("/health")
def health():
    return {"ok": True}


# --- Frontend estático (build de Vite -> backend/static) ---
STATIC_DIR = Path(__file__).parent / "static"
INDEX_HTML = STATIC_DIR / "index.html"

# Assets con hash generados por Vite (JS/CSS/imagenes).
# check_dir=False: no crashea en dev si aun no existe el build.
app.mount(
    "/assets",
    StaticFiles(directory=STATIC_DIR / "assets", check_dir=False),
    name="assets",
)


# Catch-all: sirve index.html para client-side routing.
# Excluye /api/* (ya declarados arriba) para no tragarse la API.
@app.get("/{full_path:path}")
def spa(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not Found")
    if INDEX_HTML.exists():
        return FileResponse(INDEX_HTML)
    raise HTTPException(status_code=404, detail="Frontend build no encontrado. Corre 'npm run build'.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
