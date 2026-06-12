@echo off
REM Skip installation in CI/sandbox environments to avoid timeouts
if "%CI%"=="true" (
    echo Skipping agent installation in CI/sandbox environment.
    exit /b 0
)
if "%GITHUB_ACTIONS%"=="true" (
    echo Skipping agent installation in CI/sandbox environment.
    exit /b 0
)

REM Navigate to the agent directory
cd /d "%~dp0\..\agent" || exit /b 1

pnpm install
