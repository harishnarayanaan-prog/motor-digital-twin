@echo off
title Electric Motor Digital Twin Platform
color 0B

echo ===============================================================================
echo     ELECTRIC MOTOR DIGITAL TWIN, REAL-TIME CONDITION MONITORING
echo                  AND PREDICTIVE MAINTENANCE SYSTEM
echo ===============================================================================
echo.
echo [1/3] Checking environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

echo [OK] Python and Node.js detected.
echo.

echo [2/3] Launching FastAPI Backend on port 8000...
start "Motor Twin - Backend Server" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Launching React Vite Frontend on port 5173...
start "Motor Twin - Frontend Dashboard" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===============================================================================
echo  Platform is starting up!
echo.
echo  - Frontend Dashboard: http://localhost:5173
echo  - Backend API:        http://localhost:8000
echo  - Swagger OpenAPI:    http://localhost:8000/docs
echo  - WebSocket Stream:   ws://localhost:8000/ws/telemetry
echo ===============================================================================
echo.
pause
