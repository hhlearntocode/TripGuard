#!/usr/bin/env python3
"""
TripGuard — Project initializer & dev launcher.

Usage:
    python scripts/init.py setup   # Create venv, install Python + Node deps
    python scripts/init.py dev     # Start backend (uvicorn) + frontend (expo web)
    python scripts/init.py build   # Build frontend static export for Vercel
"""

import os
import sys
import subprocess
import shutil
import signal
import platform
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT
FRONTEND_DIR = ROOT / "frontend"
VENV_DIR = ROOT / "venv"

IS_WIN = platform.system() == "Windows"
VENV_PYTHON = VENV_DIR / ("Scripts/python.exe" if IS_WIN else "bin/python")
VENV_PIP = VENV_DIR / ("Scripts/pip.exe" if IS_WIN else "bin/pip")


# ── Helpers ──────────────────────────────────────────────────────────────

def run(cmd: list[str], cwd: Path = ROOT, check: bool = True, **kwargs):
    print(f"  → {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=str(cwd), check=check, **kwargs)


def header(msg: str):
    print(f"\n{'=' * 60}\n  {msg}\n{'=' * 60}")


def check_bin(name: str) -> str | None:
    return shutil.which(name)


def ensure_python():
    v = sys.version_info
    if v < (3, 10):
        print(f"Python 3.10+ required (found {v.major}.{v.minor}.{v.micro})")
        sys.exit(1)
    print(f"  Python {v.major}.{v.minor}.{v.micro}")


def ensure_node():
    node = check_bin("node")
    if not node:
        print("Node.js not found. Install Node 18+ from https://nodejs.org")
        sys.exit(1)
    result = subprocess.run(["node", "--version"], capture_output=True, text=True)
    print(f"  Node {result.stdout.strip()}")


def ensure_npm():
    npm = check_bin("npm")
    if not npm:
        print("npm not found. It ships with Node.js — reinstall Node.")
        sys.exit(1)


# ── Commands ─────────────────────────────────────────────────────────────

def cmd_setup():
    """Create venv, install Python deps, install frontend Node deps."""
    header("1/3  Checking prerequisites")
    ensure_python()
    ensure_node()
    ensure_npm()

    header("2/3  Python virtual environment + dependencies")
    if not VENV_DIR.exists():
        print("  Creating venv …")
        run([sys.executable, "-m", "venv", str(VENV_DIR)])
    else:
        print("  venv already exists — skipping creation")

    req = ROOT / "requirements.txt"
    if req.exists():
        run([str(VENV_PIP), "install", "-r", str(req)])
    else:
        print("  requirements.txt not found — skipping pip install")

    header("3/3  Frontend Node dependencies")
    if not (FRONTEND_DIR / "node_modules").exists():
        run(["npm", "install"], cwd=FRONTEND_DIR)
    else:
        print("  node_modules exists — running npm install to sync")
        run(["npm", "install"], cwd=FRONTEND_DIR)

    env_file = ROOT / ".env"
    if not env_file.exists():
        print("\n  WARNING: .env file not found at project root.")
        print("  Copy .env.example → .env and fill in your API keys.")

    header("Setup complete")
    print("  Run:  python scripts/init.py dev")


def cmd_dev():
    """Start backend (uvicorn) and frontend (expo web) in parallel."""
    header("Starting TripGuard dev servers")

    if not VENV_PYTHON.exists():
        print("  venv not found — run 'python scripts/init.py setup' first.")
        sys.exit(1)

    env = os.environ.copy()
    # Ensure .env is loaded by uvicorn (python-dotenv handles it in main.py)

    print("\n  [backend]  uvicorn backend.main:app --reload")
    print(f"  [frontend] npx expo start --web")
    print(f"\n  Backend  → http://localhost:8000")
    print(f"  Frontend → http://localhost:8081")
    print(f"\n  Press Ctrl+C to stop both.\n")

    procs: list[subprocess.Popen] = []

    def cleanup(signum=None, frame=None):
        for p in procs:
            try:
                p.terminate()
                p.wait(timeout=5)
            except Exception:
                p.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        backend = subprocess.Popen(
            [str(VENV_PYTHON), "-m", "uvicorn", "backend.main:app", "--reload",
             "--host", "0.0.0.0", "--port", "8000"],
            cwd=str(ROOT),
            env=env,
        )
        procs.append(backend)

        frontend = subprocess.Popen(
            ["npx", "expo", "start", "--web"],
            cwd=str(FRONTEND_DIR),
            env=env,
        )
        procs.append(frontend)

        # Wait for either to exit
        while True:
            for p in procs:
                ret = p.poll()
                if ret is not None:
                    name = "backend" if p is backend else "frontend"
                    print(f"\n  [{name}] exited with code {ret}")
                    cleanup()
            import time
            time.sleep(1)

    except KeyboardInterrupt:
        cleanup()


def cmd_build():
    """Build frontend static export for Vercel deployment."""
    header("Building frontend for Vercel")

    if not (FRONTEND_DIR / "node_modules").exists():
        print("  Installing frontend deps first …")
        run(["npm", "install"], cwd=FRONTEND_DIR)

    run(["npx", "expo", "export", "--platform", "web"], cwd=FRONTEND_DIR)

    dist = FRONTEND_DIR / "dist"
    if dist.exists():
        print(f"\n  Static export ready at: {dist}")
        print(f"  Files: {sum(1 for _ in dist.rglob('*') if _.is_file())}")
    else:
        print("\n  ERROR: dist/ not created. Check expo export output above.")
        sys.exit(1)

    header("Build complete")


# ── Entry point ──────────────────────────────────────────────────────────

COMMANDS = {
    "setup": cmd_setup,
    "dev": cmd_dev,
    "build": cmd_build,
}

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        print("Available commands:")
        for name, fn in COMMANDS.items():
            print(f"  {name:10s} {fn.__doc__}")
        sys.exit(1)

    COMMANDS[sys.argv[1]]()


if __name__ == "__main__":
    main()
