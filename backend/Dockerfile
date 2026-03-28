FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
ENV PIP_REQUIRE_HASHES=0
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY data ./data

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
