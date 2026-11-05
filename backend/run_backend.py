import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

# Add Aurelix packages if available
aurelix_site = Path(r"C:\Users\Sanchit\Projects\Aurelix Annotate\.venv\Lib\site-packages")
if aurelix_site.exists():
    sys.path.insert(0, str(aurelix_site))

import uvicorn
import socket

def get_lan_ips():
    ips = []
    try:
        # Get hostname
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    return ips

if __name__ == "__main__":
    lan_ips = get_lan_ips()
    print("=" * 60)
    print(" VisionForge Studio - Server Starting")
    print(" Local Access:   http://localhost:8000")
    print(" Loopback:       http://127.0.0.1:8000")
    for ip in lan_ips:
        print(f" LAN Access:     http://{ip}:8000")
    print("=" * 60)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
