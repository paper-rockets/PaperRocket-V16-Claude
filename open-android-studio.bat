@echo off
setlocal

echo =======================================================================
echo          Launching Android Studio - Remix 3D Studio Project
echo =======================================================================
echo.

set "STUDIO_EXE=C:\Program Files\Android\Android Studio\bin\studio64.exe"
set "PROJECT_DIR=%~dp0src-tauri\gen\android"

if exist "%STUDIO_EXE%" (
    echo Opening project: "%PROJECT_DIR%"
    start "" "%STUDIO_EXE%" "%PROJECT_DIR%"
) else (
    echo [WARNING] studio64.exe not found at default location.
    echo Trying PATH...
    start "" studio64.exe "%PROJECT_DIR%"
)

echo Done.
timeout /t 3 >nul
