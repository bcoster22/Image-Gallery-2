import psutil
import socket

port = 2020
print(f"Checking port {port}...")

# Check socket connect
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = s.connect_ex(('127.0.0.1', port))
s.close()
print(f"Socket connect result: {result} (0 means open)")

# Check psutil
found = False
for proc in psutil.process_iter(['pid', 'name', 'connections']):
    try:
        for conn in proc.connections(kind='inet'):
            if conn.laddr.port == port:
                print(f"FOUND Process: PID={proc.pid}, Name={proc.name()}")
                found = True
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        pass

if not found:
    print("PSUTIL DID NOT FIND PROCESS ON PORT 2020")
else:
    print("PSUTIL SUCCESS")
