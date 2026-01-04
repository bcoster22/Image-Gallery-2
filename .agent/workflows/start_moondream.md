---
description: Start the Moondream Station AI Server with SDXL and multi-model support
---

This workflow starts the local `moondream-station` server.
The source code is located at `~/Documents/Github_Projects/moondream-station` and runtime data at `~/.moondream-station`.
It ensures `single_model_mode` is disabled (to allow SDXL backend) and runs the server from the source script to pick up all backends.

1. **Configure Server**: Enable multi-model mode in `config.json`.
   ```bash
   sed -i 's/"single_model_mode": true/"single_model_mode": false/' /home/bcoster/.moondream-station/config.json
   ```

2. **Clean Port**: Ensure port 2020 (default) is free.
   ```bash
   fuser -k 2020/tcp
   ```

   ```bash
   nohup bash -c "cd ~/Documents/Github_Projects/moondream-station && source .venv/bin/activate && ./start_server.sh" > ~/.moondream-station/server_workflow.log 2>&1 &
   ```

4. **Verify**: Check the log for "[SDXL] Backend loaded" to confirm success.
   ```bash
   tail -n 20 /home/bcoster/.moondream-station/server_workflow.log
   ```
