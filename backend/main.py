import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import argparse
import logging
import os
import sys

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import config, paths
from backend.routers import system, models, generation, analysis

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MoondreamBackend")

app = FastAPI(title="Moondream Station Backend", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(system.router, tags=["System"])
app.include_router(models.router, tags=["Models"])
app.include_router(generation.router, tags=["Generation"])
app.include_router(analysis.router, tags=["Analysis"])

@app.on_event("startup")
async def startup_event():
    logger.info(f"Server starting...")
    logger.info(f"Models Root: {paths.MODELS_ROOT}")
    logger.info(f"Checkpoints: {paths.CHECKPOINTS_DIR}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=2020)
    parser.add_argument("--host", type=str, default="0.0.0.0")
    args = parser.parse_args()

    uvicorn.run(app, host=args.host, port=args.port)
