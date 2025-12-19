from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime

app = Flask(__name__)
# Enable CORS for all domains/origins (since frontend is on 5173 and this is 3001)
CORS(app)

# In-memory log storage
# In a real production app, this should probably be a database or rotated file
logs = []
MAX_LOGS = 2000

# Configure Flask logging to not be too noisy
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "log-server"})

@app.route('/log', methods=['POST'])
def add_log():
    try:
        entry = request.json
        if not entry:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Add basic server-side timestamp if missing (frontend usually provides it)
        if 'timestamp' not in entry:
            entry['timestamp'] = datetime.now().isoformat()
            
        logs.append(entry)
        
        # Rotation
        if len(logs) > MAX_LOGS:
            logs.pop(0)
            
        return jsonify({"status": "logged", "count": len(logs)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/log', methods=['GET'])
def get_logs():
    # Optional filtering parameters could be added here
    # e.g. ?level=ERROR or ?limit=50
    return jsonify(logs)

@app.route('/log/clear', methods=['POST'])
def clear_logs():
    global logs
    logs = []
    return jsonify({"status": "cleared"}), 200

if __name__ == '__main__':
    print("Starting Log Server on port 3001...")
    # Run on all interfaces, port 3001
    app.run(host='0.0.0.0', port=3001, debug=True, use_reloader=False)
