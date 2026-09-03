@echo off
setlocal enabledelayedexpansion

echo =======================================================================
echo          Remix 3D Model Painting Studio - Android APK Compiler
echo =======================================================================
echo.

node scripts/build-apk.mjs
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed with exit code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Compilation completed successfully!
pause
