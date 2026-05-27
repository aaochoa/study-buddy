@echo off
REM Navigate to the agent directory
cd /d %~dp0\..\agent

REM Run the adk QA dev
pnpm dev:qa
