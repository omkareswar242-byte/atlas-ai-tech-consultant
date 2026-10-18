"""Start the Python API and ATLAS frontend; Ctrl+C stops both child processes."""

import argparse
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--node-dir", type=Path, help="Optional portable Node directory")
    options = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    executable = "node.exe" if os.name == "nt" else "node"
    node = str(options.node_dir / executable) if options.node_dir else shutil.which("node")
    if not node or not Path(node).is_file():
        raise SystemExit("Node.js is missing. Install Node 22+, or pass --node-dir to a portable Node folder.")
    vite = root / "frontend/node_modules/vite/bin/vite.js"
    if not vite.is_file():
        raise SystemExit("Frontend dependencies missing. Run npm install from frontend/ first.")
    for port in (8000, 5173):
        with socket.socket() as connection:
            if connection.connect_ex(("127.0.0.1", port)) == 0:
                raise SystemExit(f"Port {port} is already in use. Keep the existing server or stop it before using this launcher.")
    children: list[subprocess.Popen] = []
    try:
        children.append(subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], cwd=root))
        children.append(subprocess.Popen([node, str(vite), "--host", "127.0.0.1"], cwd=root / "frontend"))
        print("ATLAS: http://localhost:5173 | API: http://127.0.0.1:8000/docs", flush=True)
        while all(child.poll() is None for child in children):
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopping ATLAS…")
    finally:
        for child in children:
            if child.poll() is None:
                child.terminate()
        for child in children:
            try:
                child.wait(timeout=8)
            except subprocess.TimeoutExpired:
                child.kill()


if __name__ == "__main__":
    main()
