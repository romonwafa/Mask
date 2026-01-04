# syntax=docker/dockerfile:1.4
FROM python:3.11-bookworm

WORKDIR /app

COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
# default: API server
CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8000"]
