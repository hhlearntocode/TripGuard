#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR"

PYTHON_BIN="/Users/leonard/miniconda3/bin/python3"
JAVA_HOME_DEFAULT="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
ANDROID_SDK_ROOT_DEFAULT="/opt/homebrew/share/android-commandlinetools"
AVD_NAME="${1:-TripGuard_API34}"

JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_SDK_ROOT_DEFAULT}"
ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"

ADB_BIN="$ANDROID_SDK_ROOT/platform-tools/adb"
EMULATOR_BIN="$ANDROID_SDK_ROOT/emulator/emulator"

BACKEND_LOG="/tmp/tripguard-backend.log"
EMULATOR_LOG="/tmp/tripguard-emulator.log"
METRO_LOG="/tmp/tripguard-metro.log"
APP_ID="com.tripguard.app"
METRO_PORT="${METRO_PORT:-8081}"

require_file() {
  local path="$1"
  local label="$2"
  if [[ ! -e "$path" ]]; then
    echo "Missing $label: $path" >&2
    exit 1
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing command: $cmd" >&2
    exit 1
  fi
}

wait_for_port() {
  local port="$1"
  local tries="${2:-30}"
  local i
  for ((i = 0; i < tries; i++)); do
    if lsof -ti "tcp:$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_emulator_boot() {
  "$ADB_BIN" wait-for-device >/dev/null 2>&1
  until [[ "$("$ADB_BIN" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
    sleep 2
  done
}

ensure_frontend_dependencies() {
  if [[ ! -f "$FRONTEND_DIR/node_modules/@expo/cli/package.json" ]]; then
    echo "Repairing frontend dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
  fi
}

echo "== TripGuard Android Runner =="
echo "Root: $ROOT_DIR"
echo "AVD:  $AVD_NAME"

require_file "$PYTHON_BIN" "Python executable"
require_file "$JAVA_HOME/bin/java" "Android Studio JDK"
require_file "$ADB_BIN" "adb"
require_file "$EMULATOR_BIN" "Android emulator binary"
require_cmd npm
require_cmd lsof

export JAVA_HOME
export ANDROID_SDK_ROOT
export ANDROID_HOME
export CI=false

ensure_frontend_dependencies

if lsof -ti tcp:8000 >/dev/null 2>&1; then
  echo "Backend already running on port 8000"
else
  echo "Starting backend on http://127.0.0.1:8000"
  nohup "$PYTHON_BIN" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 \
    >"$BACKEND_LOG" 2>&1 &
  sleep 2
fi

if "$ADB_BIN" devices | rg -q '^emulator-[0-9]+\s+device$'; then
  echo "Android emulator already connected"
else
  echo "Starting emulator: $AVD_NAME"
  nohup "$EMULATOR_BIN" -avd "$AVD_NAME" -no-metrics >"$EMULATOR_LOG" 2>&1 &
fi

echo "Waiting for emulator boot..."
wait_for_emulator_boot
echo "Emulator is ready"

cd "$FRONTEND_DIR"

if lsof -ti "tcp:$METRO_PORT" >/dev/null 2>&1; then
  echo "Port $METRO_PORT already in use; reusing existing Metro server"
else
  echo "Starting Metro dev server on port $METRO_PORT"
  nohup npm run start -- --offline --dev-client --port "$METRO_PORT" \
    >"$METRO_LOG" 2>&1 &
fi

echo "Waiting for Metro..."
wait_for_port "$METRO_PORT" 60
echo "Metro is ready"

"$ADB_BIN" reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT" >/dev/null 2>&1 || true

echo "Building and launching app..."
npm run android -- --no-bundler --no-build-cache

echo
echo "Done."
echo "Backend log:  $BACKEND_LOG"
echo "Emulator log: $EMULATOR_LOG"
echo "Metro log:    $METRO_LOG"
