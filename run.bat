@echo off
cd /d "%~dp0"
REM MinIO: API :9000, console :9001 (креды как в back/.env: admin / adminpassword)
docker start minio 2>nul
if errorlevel 1 (
  docker run -d -p 9000:9000 -p 9001:9001 --name minio -e MINIO_ROOT_USER=admin -e MINIO_ROOT_PASSWORD=adminpassword -v minio_data:/data minio/minio server /data --console-address ":9001"
  if errorlevel 1 (
    echo ERROR: MinIO container failed. Is Docker Desktop running?
    pause
    exit /b 1
  )
)

echo Waiting for MinIO on port 9000...
set /a _n=0
:wait9000
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1',9000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto minio_ready
set /a _n+=1
if %_n% geq 60 goto minio_timeout
timeout /t 1 /nobreak >nul
goto wait9000

:minio_timeout
echo ERROR: Port 9000 not open after 60s. Check: docker ps -a --filter name=minio
pause
exit /b 1

:minio_ready

start "Frontend" /D "%~dp0front" cmd /k npm run dev
start "Backend" /D "%~dp0back" cmd /k "call venv\Scripts\activate.bat && python run_server.py"
