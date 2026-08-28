# Build frontend
FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Runtime: Manim + LaTeX + FastAPI
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libffi-dev \
    shared-mime-info \
    dvisvgm \
    cm-super \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-science \
    texlive-lang-other \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend /app/frontend/dist /app/frontend/dist

RUN mkdir -p /app/media/outputs /app/media/jobs

WORKDIR /app/backend
EXPOSE 8000

# Render sets $PORT; default 8000 for local Docker
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
