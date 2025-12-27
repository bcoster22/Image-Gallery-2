#!/bin/bash
# Start backend and log server for debugging memory leaks
# Usage: ./scripts/start_debug_backend.sh

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. Kill existing backend/log servers to ensure clean state
echo "Stopping existing backend processes..."
pkill -f "python3.*dev_run_backend.py"
pkill -f "python3.*log_server.py"
pkill -f "python3.*rest_server_temp_5.py"

# Wait a moment
sleep 2

# 2. Start Log Server
echo "Starting Log Server (port 3001)..."
if [ -f ".venv/bin/python3" ]; then
    PYTHON="./.venv/bin/python3"
else
    PYTHON="python3"
fi

$PYTHON log_server.py > /dev/null 2>&1 &
LOG_PID=$!
echo "Log Server started (PID: $LOG_PID)"

# 3. Start Backend with tee to backend.log
echo "Starting Backend (port 2020)..."
echo "Logs will be visible here and in backend.log"
echo "---------------------------------------------------"

$PYTHON dev_run_backend.py 2>&1 | tee backend.log
