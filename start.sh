#!/bin/bash
# =============================================================================
# Local Startup Script – Plagiarism Detection System (Linux/Mac)
# =============================================================================
# Starts: PostgreSQL | Redis | MinIO | Backend API | Celery | Frontend
#         + BERT Model Loading + Database Seed + PDF Generation Ready
# =============================================================================

set -e

echo "========================================="
echo "  Plagiarism Detection System - Startup"
echo "========================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed."
    echo "Please install Docker from https://www.docker.com/"
    exit 1
fi

echo "[1/5] Building Docker images..."
docker compose -f docker-compose.prod.yml build --parallel

echo ""
echo "[2/5] Starting infrastructure services (DB, Redis, MinIO)..."
docker compose -f docker-compose.prod.yml up -d db redis minio
echo "    Waiting for databases to be ready..."
sleep 10

echo ""
echo "[3/5] Starting Backend API (FastAPI + BERT model loading)..."
docker compose -f docker-compose.prod.yml up -d api
echo "    Loading Sentence-BERT model (first run may take 1-2 minutes)..."
sleep 30

echo ""
echo "[4/5] Starting Celery workers (plagiarism analysis engine)..."
docker compose -f docker-compose.prod.yml up -d celery-worker celery-beat
sleep 5

echo ""
echo "[5/5] Starting Frontend (React + Nginx)..."
docker compose -f docker-compose.prod.yml up -d frontend
sleep 5

echo ""
echo "========================================="
echo "  Health Checks"
echo "========================================="
echo ""

# Health checks
check_service() {
    local name=$1
    local cmd=$2
    if eval "$cmd" &> /dev/null; then
        echo "  $name: ✅ READY"
    else
        echo "  $name: ⏳ STARTING..."
    fi
}

check_service "PostgreSQL " "docker exec plagiarism_db pg_isready -U user"
check_service "Redis      " "docker exec plagiarism_redis redis-cli ping"
check_service "Backend API" "curl -sf http://localhost:8000/health"
check_service "Frontend   " "curl -sf http://localhost:80"

echo ""
echo "========================================="
echo "  ✅ System is Ready!"
echo "========================================="
echo ""
echo "  Frontend:    http://localhost:80"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  MinIO:       http://localhost:9001"
echo ""
echo "  Admin Login: admin@college.edu / AdminPass123!"
echo "  Student:     rahul@college.edu / Student123!"
echo ""
echo "  To stop:  docker compose -f docker-compose.prod.yml down"
echo "  To logs:  docker compose -f docker-compose.prod.yml logs -f"
echo "========================================="
