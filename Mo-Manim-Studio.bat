@echo off
cd /d "%~dp0"
start "Manim Backend" powershell -NoExit -Command "cd '%~dp0'; .\.venv\Scripts\Activate.ps1; cd backend; uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 2 /nobreak >nul
start "Manim Frontend" powershell -NoExit -Command "cd '%~dp0frontend'; npm run dev"
timeout /t 4 /nobreak >nul
start http://localhost:5173
