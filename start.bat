@echo off
rem ==============================================================================
rem  POA-HAC Service Startup Script for Windows (Command Prompt / PowerShell)
rem  Launches both Express Backend (Port 3001) and Vite Frontend (Port 5173)
rem ==============================================================================

setlocal
cd /d "%~dp0"

echo =================================================================
echo   Starting POA-HAC Inferred Engine ^& Clinical Review Portal
echo =================================================================

rem Check if node_modules exists
if not exist "node_modules\" (
    echo [Setup] node_modules not found. Running npm install...
    call npm install
    if errorlevel 1 (
        echo [Error] npm install failed. Please check your Node.js setup.
        pause
        exit /b 1
    )
)

echo.
echo [1/2] Launching Backend API Service (Port 3001)...
start "POA-HAC Backend (Port 3001)" cmd /k "npm run server"

rem Brief delay to ensure backend initializes port
timeout /t 2 /nobreak >nul

echo [2/2] Launching Frontend Vite UI (Port 5173)...
start "POA-HAC Frontend (Port 5173)" cmd /k "npm run dev"

echo.
echo =================================================================
echo   Both services started in dedicated console windows:
echo   ---------------------------------------------------------------
echo   Backend API:   http://localhost:3001
echo   Frontend UI:   http://localhost:5173
echo   Review Queue:  http://localhost:5173/claims
echo   ---------------------------------------------------------------
echo   To stop a service, simply close its corresponding window.
echo =================================================================
echo.
