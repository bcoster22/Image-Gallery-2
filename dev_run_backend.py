import os
import sys
import subprocess
from pathlib import Path

# Configuration
MOONDREAM_DIR = Path.home() / ".moondream-station"
VENV_PYTHON = MOONDREAM_DIR / "venv" / "bin" / "python3"
BACKEND_DIR = MOONDREAM_DIR / "moondream-station"
START_SCRIPT = BACKEND_DIR / "start_server.py"

def main():
    print(f"[Bridge] Starting Backend Bridge...")
    print(f"[Bridge] Target Python: {VENV_PYTHON}")
    print(f"[Bridge] Backend Dir: {BACKEND_DIR}")

    if not VENV_PYTHON.exists():
        print(f"[Bridge] Error: Virtual environment python not found at {VENV_PYTHON}")
        sys.exit(1)
        
    if not START_SCRIPT.exists():
        print(f"[Bridge] Error: Start script not found at {START_SCRIPT}")
        sys.exit(1)

    # Set environment variables
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    # Add backend dir to PYTHONPATH so it can find its modules
    env["PYTHONPATH"] = f"{env.get('PYTHONPATH', '')}:{BACKEND_DIR}"

    # Change to backend directory
    os.chdir(BACKEND_DIR)

    # Replace this process with the backend server process
    # This keeps the PID the same so station_manager can track it
    try:
        os.execv(
            str(VENV_PYTHON),
            [str(VENV_PYTHON), str(START_SCRIPT)]
        )
    except Exception as e:
        print(f"[Bridge] Error executing backend: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
