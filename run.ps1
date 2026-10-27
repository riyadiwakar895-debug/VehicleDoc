Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting AutoVault - Vehicle Document Expiry Tracker" -ForegroundColor Green
Write-Host " Tech Stack: FastAPI (Python) + SQL (SQLite) + React" -ForegroundColor Cyan
Write-Host " Open URL: http://localhost:8000" -ForegroundColor Yellow
Write-Host " Swagger API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Start-Process "http://127.0.0.1:8000"
Set-Location "$PSScriptRoot\backend"
& "C:\Users\Riya\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
