#!/bin/bash
source /home/bcoster/.moondream-station/venv/bin/activate

# Force kill any process on port 2021 (and default 2022) to prevent "Address already in use"
echo "Ensuring ports are free..."
fuser -k 2021/tcp > /dev/null 2>&1
fuser -k 2022/tcp > /dev/null 2>&1
# Give it a moment to release the port
sleep 1

moondream-station "$@"
