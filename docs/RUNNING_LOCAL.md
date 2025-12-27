# Running Locally with Full AI Support

This guide describes how to run the Image Gallery with full AI capabilities, specifically enabling **Multi-Model Mode** to use both the **Moondream** (Vision) and **SDXL** (Image Generation) backends simultaneously.

## Prerequisites

- **Moondream Station** installed at `~/.moondream-station`
- **Image Gallery 2** repository cloned
- Python virtual environment set up and active

## 1. Configure Multi-Model Support

By default, Moondream Station may be configured in "Single Model Mode" to save VRAM. To enable image generation (SDXL) alongside vision analysis, you must disable this.

**Command:**
```bash
sed -i 's/"single_model_mode": true/"single_model_mode": false/' ~/.moondream-station/config.json
```

*Alternatively, you can manually edit `~/.moondream-station/config.json` and set `"single_model_mode": false`.*

## 2. Start the Backend Server

We recommend starting the backend server using the raw shell script to ensure all environment variables and paths are correctly sourced from the Moondream directory.

**Command:**
```bash
# Ensure port 2020 is free
fuser -k 2020/tcp || true

# Start the server (using nohup to keep it running)
nohup bash -c "cd ~/.moondream-station && source venv/bin/activate && ./moondream-station/start_server.sh" > ~/.moondream-station/server.log 2>&1 &
```

**Verify Verification:**
You can check if the server started correctly and loaded the backends by checking the log:
```bash
tail -n 20 ~/.moondream-station/server.log
```
*Look for "Service started successfully on port 2020".*

## 3. Start the Frontend Application

Open a new terminal in the `Image-Gallery-2` directory.

**Command:**
```bash
npm run dev
```

The application will bridge to the running backend on port 2020. Since the backend is already running (from step 2), the `concurrently` command in `package.json` might try to start another instance. 

**Recommended `package.json` usage for this flow:**
If you prefer running them separately, you can just run `vite` for the frontend:
```bash
npx vite
```
*Or rely on the built-in `npm run dev` which attempts to start everything; the backend portion might fail to bind port 2020 if it's already running, but the frontend will still work and connect to the existing server.*

## Troubleshooting

- **Port Conflicts:** If `npm run dev` complains about port 2020 being in use, it means your manual server (Step 2) is working correctly. You can ignore the error or simply run `npx vite` to start only the UI.
- **Zombie Processes:** If you need to kill all backend processes to restart cleanly:
  ```bash
  pkill -f "python3.*moondream"
  pkill -f "uvicorn"
  ```

## 4. Configure Auto Fix (Optional)

To enable the "Auto Fix" feature in System Diagnostics (which can automatically resolve GPU persistence issues):

1. Go to **System Diagnostics** in the web UI.
2. Click **Setup Auto Fix**.
3. Enter your sudo password in the secure prompt.
   - This runs a one-time setup to allow the backend to execute specific repair scripts without a password in the future.
   - *Security Note*: Your password is only used for this setup and is not stored.
