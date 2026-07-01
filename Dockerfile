# ---------- Stage 1: build del frontend (Vite/React) ----------
FROM node:20-alpine AS frontend

WORKDIR /app/frontend

# Instala deps con lockfile (npm ci = build reproducible)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copia el codigo del frontend y buildea.
# vite.config.js tiene outDir '../backend/static' -> escribe a /app/backend/static
COPY frontend/ ./
RUN npm run build


# ---------- Stage 2: backend (FastAPI + Uvicorn) ----------
FROM python:3.11-slim AS backend

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app/backend

# Deps de Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Codigo del backend
COPY backend/ ./

# Seed corre a RUNTIME (startup de FastAPI), no en build:
# el Postgres de EasyPanel no es accesible durante docker build.

# Build del frontend desde el stage 1 (solo el resultado, sin node_modules)
COPY --from=frontend /app/backend/static ./static

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
