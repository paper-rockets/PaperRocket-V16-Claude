@echo off
cd /d "%~dp0"
echo Launching Remix 3D Studio (Pure Rust + wgpu)...
start "" "%~dp0target\debug\remix-app.exe"
