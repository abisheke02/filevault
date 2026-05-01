@echo off
echo ================================================
echo   FileVault - Starting all services
echo ================================================
echo.
echo [1/5] Redis       -> 127.0.0.1:6379
echo [2/5] MinIO       -> 127.0.0.1:9000  (console :9001)
echo [3/5] Meilisearch -> 127.0.0.1:7700
echo [4/5] Backend     -> localhost:3001
echo [5/5] Web         -> localhost:5173
echo.
echo Each service opens in its own window.
echo Close this window after all 5 are running.
echo ================================================
echo.

start "Redis"        cmd /k "%~dp0start-redis.bat"
timeout /t 2 /nobreak >nul

start "MinIO"        cmd /k "%~dp0start-minio.bat"
timeout /t 2 /nobreak >nul

start "Meilisearch"  cmd /k "%~dp0start-meilisearch.bat"
timeout /t 3 /nobreak >nul

start "Backend"      cmd /k "%~dp0start-backend.bat"
timeout /t 5 /nobreak >nul

start "Web"          cmd /k "%~dp0start-web.bat"

echo.
echo All services launched. Open http://localhost:5173
pause
