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
DEBUG_LOG_PATH="/Users/leonard/TripGuard/.cursor/debug-e39db2.log"
DEBUG_RUN_ID="run-android-sh"

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

# region agent log
debug_log() {
  local hypothesis_id="$1"
  local location="$2"
  local message="$3"
  local details="$4"
  "$PYTHON_BIN" - "$hypothesis_id" "$location" "$message" "$details" <<'PY'
import json, sys, time
entry = {
    "sessionId": "e39db2",
    "runId": "run-android-sh",
    "hypothesisId": sys.argv[1],
    "location": sys.argv[2],
    "message": sys.argv[3],
    "data": {"details": sys.argv[4]},
    "timestamp": int(time.time() * 1000),
}
with open("/Users/leonard/TripGuard/.cursor/debug-e39db2.log", "a", encoding="utf-8") as f:
    f.write(json.dumps(entry, ensure_ascii=False) + "\n")
PY
}
# endregion

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

# region agent log
expo_cli_present="false"
[[ -f "$FRONTEND_DIR/node_modules/@expo/cli/package.json" ]] && expo_cli_present="true"
debug_log "H1" "run-android.sh:deps" "Expo dependency snapshot" "expo_cli_present=$expo_cli_present frontend_dir=$FRONTEND_DIR"
# endregion

# region agent log
expo_version="$("$PYTHON_BIN" - <<'PY'
import json
with open("/Users/leonard/TripGuard/frontend/node_modules/expo/package.json", encoding="utf-8") as f:
    print(json.load(f)["version"])
PY
)"
linear_gradient_version="$("$PYTHON_BIN" - <<'PY'
import json
with open("/Users/leonard/TripGuard/frontend/node_modules/expo-linear-gradient/package.json", encoding="utf-8") as f:
    print(json.load(f)["version"])
PY
)"
debug_log "H6" "run-android.sh:package_versions" "Expo package versions" "expo=$expo_version expo_linear_gradient=$linear_gradient_version"
# endregion

# region agent log
android_namespace="$(sed -n 's/.*namespace "\(.*\)".*/\1/p' "$FRONTEND_DIR/android/app/build.gradle" | head -n 1)"
android_app_id="$(sed -n 's/.*applicationId "\(.*\)".*/\1/p' "$FRONTEND_DIR/android/app/build.gradle" | head -n 1)"
debug_log "H2" "run-android.sh:android_config" "Android package snapshot" "namespace=$android_namespace application_id=$android_app_id expected_app_id=$APP_ID"
# endregion

# region agent log
debug_log "H5" "run-android.sh:java_sdk" "Java and SDK snapshot" "java_home=$JAVA_HOME android_sdk_root=$ANDROID_SDK_ROOT android_home=$ANDROID_HOME"
# endregion

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

# region agent log
metro_pid="$(lsof -ti "tcp:$METRO_PORT" | head -n 1 || true)"
adb_devices="$("$ADB_BIN" devices | tr '\n' ';' || true)"
debug_log "H3" "run-android.sh:runtime_state" "Runtime state before build" "backend_port_8000=$(lsof -ti tcp:8000 | head -n 1 || true) metro_port=$METRO_PORT metro_pid=$metro_pid adb_devices=$adb_devices"
# endregion

echo "Building and launching app..."
set +e
npm run android -- --no-bundler --no-build-cache
build_exit="$?"
set -e

# region agent log
resumed_activity="$("$ADB_BIN" shell dumpsys activity activities 2>/dev/null | rg -m1 'ResumedActivity|topResumedActivity' || true)"
debug_log "H4" "run-android.sh:build_result" "Android build result" "exit_code=$build_exit resumed_activity=$resumed_activity"
# endregion

if [[ "$build_exit" -ne 0 ]]; then
  exit "$build_exit"
fi

echo
echo "Done."
echo "Backend log:  $BACKEND_LOG"
echo "Emulator log: $EMULATOR_LOG"
echo "Metro log:    $METRO_LOG"
