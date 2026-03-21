@echo off
cd /d "%~dp0"
IF NOT EXIST "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment python.exe not found! Please ensure 'python -m venv venv' was run.
    pause
    exit /b
)
echo Starting FastAPI Backend using the virtual environment explicitly...
cd backend
"..\venv\Scripts\python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 8012
pause
