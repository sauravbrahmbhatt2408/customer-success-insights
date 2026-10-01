FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN useradd --create-home app
USER app

EXPOSE 8000
# Render and similar hosts pass the port in $PORT. SEED_ON_START=true loads the demo data.
CMD ["sh", "-c", "alembic upgrade head && if [ ${SEED_ON_START:-false} = true ]; then python seed.py; fi && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
