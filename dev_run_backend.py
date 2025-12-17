
import sys
import os
import time
import signal
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DevBackend")

# Add paths
MOONDREAM_PATH = "/home/bcoster/.moondream-station/moondream-station"
if MOONDREAM_PATH not in sys.path:
    sys.path.append(MOONDREAM_PATH)
    
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

# Import Moondream dependencies
try:
    from moondream_station.core.config import ConfigManager
    from moondream_station.core.manifest import ManifestManager
except ImportError as e:
    logger.error(f"Failed to import Moondream Station: {e}")
    logger.error("Please ensure you have access to the moondream-station package.")
    sys.exit(1)

# Import local RestServer
try:
    from rest_server_temp_5 import RestServer
except ImportError as e:
    logger.error(f"Failed to import RestServer: {e}")
    sys.exit(1)

def main():
    try:
        config = ConfigManager()
        manifest_manager = ManifestManager(config)
        
        # Load manifest from external location
        manifest_path = os.path.join(MOONDREAM_PATH, "local_manifest.json")
        if os.path.exists(manifest_path):
            manifest_manager.load_manifest(manifest_path)
        else:
            logger.warning(f"Manifest not found at {manifest_path}")

        # Initialize Server
        server = RestServer(config, manifest_manager)
        
        # Ensure current model is set
        if not config.get("current_model"):
            config.set("current_model", "moondream-2")

        logger.info("Starting Development Backend Server...")
        success = server.start(host="0.0.0.0", port=2020)
        
        if success:
            logger.info("Backend Server Running on http://localhost:2020")
            
            # Handle graceful shutdown
            def signal_handler(sig, frame):
                logger.info("Stopping server...")
                server.stop()
                sys.exit(0)
                
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
            
            # Keep alive
            while True:
                time.sleep(1)
        else:
            logger.error("Failed to start server")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
