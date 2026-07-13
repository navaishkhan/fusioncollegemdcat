FROM python:3.12-slim

# Install system dependencies including Tesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port (Render automatically provides PORT env var, but uvicorn needs to bind to it)
EXPOSE 10000

# Command to run FastAPI using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
