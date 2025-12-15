from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import os
import sys

# Configure logging to file
LOG_FILE = "client_errors.log"

# Custom formatter
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

# File handler
file_handler = logging.FileHandler(LOG_FILE)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.INFO)

# Logger setup
logger = logging.getLogger("ClientLogger")
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/log")
async def log_error(request: Request):
    try:
        data = await request.json()
        if not data:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No data provided"})

        # Extract details
        level = data.get('level', 'ERROR').upper()
        message = data.get('message', 'No message')
        stack = data.get('stack')
        context = data.get('context', 'Unknown Context')
        # timestamp = data.get('timestamp') # included in logger's asctime

        # Format the log entry
        log_entry = f"[{context}] {message}"
        if stack:
            log_entry += f"\nStack Trace:\n{stack}"
        
        # Log it
        if level == 'WARN':
            logger.warning(log_entry)
        elif level == 'INFO':
            logger.info(log_entry)
        else:
            logger.error(log_entry)

        return {"status": "success"}

    except Exception as e:
        print(f"Failed to log error: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.get("/health")
async def health_check():
    size = os.path.getsize(LOG_FILE) if os.path.exists(LOG_FILE) else 0
    return {"status": "ok", "log_file": LOG_FILE, "size": size}

import re

@app.get("/logs")
async def get_logs(limit: int = 100):
    if not os.path.exists(LOG_FILE):
        return {"logs": []}
    
    logs = []
    # Pattern to match: YYYY-MM-DD HH:MM:SS,ms - LEVEL - [Context] Message
    log_pattern = re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (INFO|WARN|ERROR) - (.*)')
    
    try:
        with open(LOG_FILE, 'r') as f:
            lines = f.readlines()
            
        # Parse lines in reverse order to get newest first
        for line in reversed(lines):
            match = log_pattern.match(line)
            if match:
                timestamp, level, content = match.groups()
                # Extract context from content if possible: [Context] Message
                context = "General"
                message = content
                if content.startswith('['):
                    end_bracket = content.find(']')
                    if end_bracket != -1:
                        context = content[1:end_bracket]
                        message = content[end_bracket+1:].strip()

                logs.append({
                    "timestamp": timestamp,
                    "level": level,
                    "context": context,
                    "message": message
                })
                
            if len(logs) >= limit:
                break
                
        return {"logs": logs}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.delete("/logs")
async def clear_logs():
    try:
        # Clear the file
        open(LOG_FILE, 'w').close()
        return {"status": "success", "message": "Logs cleared"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


if __name__ == '__main__':
    print(f"Starting Log Server on port 3001...")
    print(f"Logs will be written to: {os.path.abspath(LOG_FILE)}")
    uvicorn.run(app, host="0.0.0.0", port=3001, log_level="error")

