@echo off
REM Change to the project root directory
cd /d "C:\Users\workr\Projects\Memory-Research-Assistant"

echo Stopping Docker services...
docker compose down

echo.
echo Services have been stopped.
echo Press any key to close this window...
pause >nul
