@echo off
echo ========================================================
echo  Starting AutoVault - Vehicle Document Expiry Tracker
echo  Tech Stack: FastAPI (Python) + SQL (SQLite) + React
echo ========================================================
echo.

cd /d "%~dp0backend"
echo Opening browser at http://127.0.0.1:8000 ...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8000"
"C:\Users\Riya\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
