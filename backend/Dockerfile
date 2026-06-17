# Бэкенд: Flask + SQLite
FROM python:3.12-slim

WORKDIR /app

# Сначала зависимости — кешируется отдельным слоем.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Затем исходный код (venv/__pycache__/*.db исключены через .dockerignore).
COPY . .

EXPOSE 5000

# init_db() вызывается внутри app.py при старте.
CMD ["python", "app.py"]
