@echo off
REM Change to the project root directory
cd /d "C:\Users\workr\Projects\Memory-Research-Assistant"

echo Starting Docker services and waiting 20 seconds...
powershell -Command "docker compose up --build -d; Start-Sleep -Seconds 20; Start-Process http://localhost:5174"

echo.
echo Application should now be accessible in your browser.
echo Press any key to close this window...
pause >nul
