#!/usr/bin/env bash
# Install the Amartya OS GNOME extension set for the current user.
# Safe defaults: no sudo, no system-wide writes, no overwriting existing extensions.
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$ROOT/backup/extensions"
MANIFEST="$ROOT/manifests/enabled-extensions.txt"
USER_EXT_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions"
REPLACE_EXISTING=0
NO_ENABLE=0

usage() {
  cat <<'USAGE'
Amartya OS GNOME Extension Installer

Usage: ./install.sh [--replace-existing] [--no-enable] [--help]

  --replace-existing  Back up and replace existing per-user copies of bundled
                      extensions. Without this option, existing copies are kept.
  --no-enable         Install compatible extensions but do not enable them.
  --help              Show this help.

Installs only extensions listed in manifests/enabled-extensions.txt.
It does not use sudo, install OS packages, change system-wide files, or restart
GNOME Shell. Log out and back in if GNOME does not load newly installed ones.
USAGE
}

while (($#)); do
  case "$1" in
    --replace-existing) REPLACE_EXISTING=1 ;;
    --no-enable) NO_ENABLE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

[[ -f "$MANIFEST" ]] || { echo "ERROR: Missing manifest: $MANIFEST" >&2; exit 1; }
[[ -d "$SOURCE_ROOT" ]] || { echo "ERROR: Missing extension sources: $SOURCE_ROOT" >&2; exit 1; }

for cmd in python3 gnome-extensions gsettings glib-compile-schemas; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "ERROR: Required command '$cmd' is missing. Run this from a GNOME desktop with its tools installed." >&2
    exit 1
  }
done

gsettings list-schemas | grep -qx 'org.gnome.shell' || {
  echo "ERROR: GNOME Shell settings schema is unavailable in this session." >&2
  echo "Run this on an installed GNOME desktop, not a text-only console." >&2
  exit 1
}

SHELL_VERSION="$(gnome-shell --version 2>/dev/null || true)"
SHELL_MAJOR="$(printf '%s\n' "$SHELL_VERSION" | sed -nE 's/.* ([0-9]+)(\..*)?$/\1/p' | head -n1)"
[[ -n "$SHELL_MAJOR" ]] || {
  echo "ERROR: Could not determine the GNOME Shell version." >&2
  exit 1
}

mkdir -p "$USER_EXT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="$USER_EXT_DIR/.amartya-installer-backups/$STAMP"
installed=0
enabled=0
skipped=0
missing=0
failed=0
declare -a TO_ENABLE=()

echo "Amartya OS GNOME Extension Installer"
echo "GNOME Shell: $SHELL_VERSION"
echo "Manifest:    $MANIFEST"
echo "Install to:  $USER_EXT_DIR"
echo

while IFS= read -r uuid || [[ -n "$uuid" ]]; do
  uuid="${uuid%$'\r'}"
  [[ -z "$uuid" || "$uuid" == \#* ]] && continue

  src="$SOURCE_ROOT/$uuid"
  dst="$USER_EXT_DIR/$uuid"

  if [[ ! -d "$src" ]]; then
    # Some entries may be supplied by the base distribution rather than bundled here.
    if gnome-extensions list 2>/dev/null | grep -Fxq -- "$uuid"; then
      echo "[SYSTEM/EXISTING] $uuid"
      TO_ENABLE+=("$uuid")
    else
      echo "[MISSING SOURCE] $uuid (not bundled and not detected as installed)"
      missing=$((missing + 1))
    fi
    continue
  fi

  metadata="$src/metadata.json"
  if [[ ! -f "$metadata" ]]; then
    echo "[SKIP] $uuid — metadata.json is missing"
    skipped=$((skipped + 1))
    continue
  fi

  if ! python3 - "$metadata" "$uuid" "$SHELL_MAJOR" <<'PY'
import json, sys
path, expected_uuid, shell_major = sys.argv[1:]
try:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
except Exception as exc:
    print(f"invalid metadata.json: {exc}", file=sys.stderr)
    sys.exit(2)
if data.get("uuid") != expected_uuid:
    print(f"metadata UUID is {data.get('uuid')!r}, expected {expected_uuid!r}", file=sys.stderr)
    sys.exit(3)
versions = data.get("shell-version")
if not isinstance(versions, list) or not versions:
    print("no shell-version compatibility list", file=sys.stderr)
    sys.exit(4)
if shell_major not in {str(v).split(".")[0] for v in versions}:
    print(f"does not declare GNOME Shell {shell_major} compatibility (declares {versions})", file=sys.stderr)
    sys.exit(5)
PY
  then
    echo "[INCOMPATIBLE/INVALID] $uuid — not installed"
    skipped=$((skipped + 1))
    continue
  fi

  if [[ -e "$dst" ]]; then
    if diff -qr -- "$src" "$dst" >/dev/null 2>&1; then
      echo "[UNCHANGED] $uuid"
      TO_ENABLE+=("$uuid")
      continue
    fi
    if (( ! REPLACE_EXISTING )); then
      echo "[KEPT EXISTING] $uuid — differs from bundle; use --replace-existing to back up and replace"
      TO_ENABLE+=("$uuid")
      skipped=$((skipped + 1))
      continue
    fi
    mkdir -p "$BACKUP_ROOT"
    cp -a -- "$dst" "$BACKUP_ROOT/"
    echo "[BACKED UP] $uuid -> $BACKUP_ROOT/$uuid"
    rm -rf -- "$dst"
  fi

  install -d "$dst"
  cp -a -- "$src/." "$dst/"
  if [[ -d "$dst/schemas" ]] && find "$dst/schemas" -maxdepth 1 -name '*.gschema.xml' -print -quit | grep -q .; then
    if ! glib-compile-schemas --strict "$dst/schemas"; then
      echo "[SCHEMA ERROR] $uuid — removing the just-copied extension"
      rm -rf -- "$dst"
      failed=$((failed + 1))
      continue
    fi
  fi

  echo "[INSTALLED] $uuid"
  installed=$((installed + 1))
  TO_ENABLE+=("$uuid")
done < "$MANIFEST"

if (( ! NO_ENABLE )); then
  echo
  echo "Enabling compatible extensions..."
  for uuid in "${TO_ENABLE[@]}"; do
    if gnome-extensions enable "$uuid" >/dev/null 2>&1; then
      echo "[ENABLED] $uuid"
      enabled=$((enabled + 1))
    else
      echo "[ENABLE FAILED] $uuid — installed, but GNOME did not enable it"
      failed=$((failed + 1))
    fi
  done
else
  echo
  echo "Enable step skipped (--no-enable)."
fi

echo
echo "Summary: installed=$installed enabled=$enabled skipped=$skipped missing=$missing failed=$failed"
if [[ -d "$BACKUP_ROOT" ]]; then
  echo "Existing extension backups: $BACKUP_ROOT"
fi
echo "No system-wide files were changed and GNOME Shell was not restarted."
echo "If extensions do not appear immediately, log out and back in."
if (( missing > 0 || failed > 0 )); then
  echo "Some items need attention; review the messages above."
  exit 1
fi
