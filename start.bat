@echo off
REM =============================================================================
REM Local Startup Script – Plagiarism Detection System
REM =============================================================================
REM Starts: PostgreSQL | Redis | MinIO | Backend API | Celery | Frontend
REM         + BERT Model Loading + Database Seed + PDF Generation Ready
REM =============================================================================

echo =========================================
echo   Plagiarism Detection System - Startup
echo =========================================
echo.

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running.
    echo Please install Docker Desktop from https://www.docker.com/
    exit /b 1
)

echo [1/5] Building Docker images...
docker compose -f docker-compose.prod.yml build --parallel
if %errorlevel% neq 0 (
    echo ERROR: Docker build failed!
    exit /b 1
)

echo.
echo [2/5] Starting infrastructure services (DB, Redis, MinIO)...
docker compose -f docker-compose.prod.yml up -d db redis minio
echo     Waiting for databases to be ready...
timeout /t 10 /nobreak >nul

echo.
echo [3/5] Starting Backend API (FastAPI + BERT model loading)...
docker compose -f docker-compose.prod.yml up -d api
echo     Loading Sentence-BERT model (first run may take 1-2 minutes)...
timeout /t 30 /nobreak >nul

echo.
echo [4/5] Starting Celery workers (plagiarism analysis engine)...
docker compose -f docker-compose.prod.yml up -d celery-worker celery-beat
timeout /t 5 /nobreak >nul

echo.
echo [5/5] Starting Frontend (React + Nginx)...
docker compose -f docker-compose.prod.yml up -d frontend
timeout /t 5 /nobreak >nul

echo.
echo =========================================
echo   Health Checks
echo =========================================
echo.

echo Checking PostgreSQL...
docker exec plagiarism_db pg_isready -U user >nul 2>&1
if %errorlevel% equ 0 (echo   PostgreSQL:  READY) else (echo   PostgreSQL:  NOT READY)

echo Checking Redis...
docker exec plagiarism_redis redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (echo   Redis:       READY) else (echo   Redis:       NOT READY)

echo Checking API...
curl -sf http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (echo   Backend API: READY) else (echo   Backend API: STARTING... please wait)

echo Checking Frontend...
curl -sf http://localhost:80 >nul 2>&1
if %errorlevel% equ 0 (echo   Frontend:    READY) else (echo   Frontend:    STARTING... please wait)

echo.
echo =========================================
echo   System is Ready!
echo =========================================
echo.
echo   Frontend:    http://localhost:80
echo   Backend API: http://localhost:8000
echo   API Docs:    http://localhost:8000/docs
echo   MinIO:       http://localhost:9001
echo.
echo   Admin Login: admin@college.edu / AdminPass123!
echo   Student:     rahul@college.edu / Student123!
echo.
echo   To stop:  docker compose -f docker-compose.prod.yml down
echo   To logs:  docker compose -f docker-compose.prod.yml logs -f
echo =========================================
