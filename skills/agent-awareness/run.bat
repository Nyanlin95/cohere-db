@echo off
REM Agent Awareness Dashboard Manager
REM Usage: run.bat start|stop|restart|status

cd /d "%~dp0"

if "%1"=="start" (
  echo Starting Agent Awareness server...
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003 ^| findstr LISTENING') do (
    if not "%%a"=="" (
      echo Server already running on port 3003 (PID: %%a)
      exit /b 0
    )
  )
  start /B node server.js > server.log 2>&1
  echo Server started on http://localhost:3003
  exit /b 0
)

if "%1"=="stop" (
  echo Stopping server...
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003 ^| findstr LISTENING') do (
    if not "%%a"=="" (
      taskkill /F /PID %%a
      echo Stopped PID %%a
    )
  )
  exit /b 0
)

if "%1"=="restart" (
  call :stop
  timeout /nobreak /t 2 >nul
  call :start
  exit /b 0
)

if "%1"=="status" (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003 ^| findstr LISTENING') do (
    if not "%%a"=="" (
      echo Server running on port 3003 (PID: %%a)
      exit /b 0
    )
  )
  echo Server not running
  exit /b 1
)

echo Usage: run.bat start^|stop^|restart^|status
