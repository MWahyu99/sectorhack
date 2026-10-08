# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/zoohoots_frontend
COPY zoohoots_frontend/package*.json ./
RUN npm install
COPY zoohoots_frontend/ ./
RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY zoohoots_backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY zoohoots_backend/ ./zoohoots_backend/

# Copy React build hasil stage 1
COPY --from=frontend-build /app/zoohoots_frontend/dist ./zoohoots_frontend/dist

WORKDIR /app/zoohoots_backend

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
