# Moondream Station Setup & Startup Guide

The Image Gallery 2 App relies on a local `moondream-station` instance for AI processing (Enhancement, Captioning, SDXL Generation).

## Location
The server is expected to be installed at:
`/home/bcoster/.moondream-station`

## Configuration
To enable all features (including SDXL generation), the server must be configured for **Multi-Model Mode**.
Edit `/home/bcoster/.moondream-station/config.json`:
```json
{
  ...
  "single_model_mode": false,
  "service_port": 2020
  ...
}
```

## Starting the Server
The recommended way to start the server (ensuring all backends like SDXL are loaded) is via the source script inside the virtual environment:

```bash
cd /home/bcoster/.moondream-station
source venv/bin/activate
./moondream-station/start_server.sh
```

**Note:** The standard `launch.sh` in the root might default to single-model mode or installed package versions that lack recent backend updates. Use the source script for best results.

## Integration
The frontend connects to `http://localhost:2020` (or the configured `port`).
Ensure `Admin Settings` -> `Moondream Local` endpoint is set to `http://localhost:2020` (or `http://127.0.0.1:2020`).
