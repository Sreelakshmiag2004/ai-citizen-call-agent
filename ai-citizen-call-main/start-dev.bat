@echo off
REM ============================================================================
REM start-dev.bat -- launches the Citizen Call Intelligence backend (FastAPI)
REM and frontend (Vite) for local development, each in its own terminal
REM window, so both keep running simultaneously.
REM
REM   Backend:  backend\.venv\Scripts\python.exe -m uvicorn app.main:app
REM             --host 0.0.0.0 --port 8001   (cwd: backend\)
REM   Frontend: npm run dev  ->  vite --port=3000 --host=0.0.0.0
REM             (cwd: govportal-citizen-assistant\)
REM
REM Twilio/ngrok is NOT started here -- that remains a separate, optional
REM manual step (see README.md / MASTER_TODO.md).
REM
REM Paths are resolved from this script's own location (%~dp0), so it works
REM regardless of the directory it's launched from, and each window's
REM working directory is set via `start /D` rather than an embedded `cd`,
REM which keeps quoting correct even if the repo path itself contains
REM spaces.
REM ============================================================================
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%govportal-citizen-assistant"
set "PYTHON_EXE=%BACKEND_DIR%\.venv\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [start-dev] ERROR: Backend virtual environment not found at:
    echo   "%PYTHON_EXE%"
    echo Create it first, e.g. from backend\:
    echo   python -m venv .venv
    echo   .venv\Scripts\pip install -r requirements.txt
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo [start-dev] ERROR: Frontend project not found at:
    echo   "%FRONTEND_DIR%"
    exit /b 1
)

REM Informational only -- does not block. If port 8001 is already in use
REM (e.g. a backend from an earlier session is still running), the new
REM uvicorn window will fail to bind and say so clearly on its own; this
REM just surfaces the same fact a little earlier.
netstat -ano | findstr /R /C:":8001[ ]*.*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [start-dev] NOTE: Something is already listening on port 8001.
    echo   The new backend window may fail to start if it's still occupied.
)

echo [start-dev] Starting backend  (FastAPI, http://localhost:8001) ...
start "Citizen Call Intelligence - Backend (FastAPI :8001)" /D "%BACKEND_DIR%" cmd /k ""%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8001"

echo [start-dev] Starting frontend (Vite,    http://localhost:3000) ...
start "Citizen Call Intelligence - Frontend (Vite :3000)" /D "%FRONTEND_DIR%" cmd /k "npm run dev"

echo.
echo [start-dev] Backend and frontend are launching in separate windows.
echo [start-dev] Twilio/ngrok is NOT started automatically -- see README.md for that optional step.

endlocal
