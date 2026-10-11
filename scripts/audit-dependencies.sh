#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT/backup/extensions"
OUT="$ROOT/manifests"
REPORT="$OUT/dependency-audit.txt"

mkdir -p "$OUT" "$ROOT/config"

{
    echo "AmartyaOS GNOME Extension Dependency Audit"
    echo "Date: $(date -Is)"
    echo "Target baseline: GNOME Shell 50"
    echo "Actual Shell version:"
    gnome-shell --version 2>&1 || true

    echo
    echo "=== Enabled UUIDs and extension metadata ==="

    while IFS= read -r uuid; do
        [ -n "$uuid" ] || continue
        dir="$EXT_DIR/$uuid"

        echo
        echo "UUID: $uuid"

        if [ ! -d "$dir" ]; then
            echo "STATUS: SOURCE DIRECTORY MISSING"
            continue
        fi

        if [ -f "$dir/metadata.json" ]; then
            python3 - "$dir/metadata.json" <<'PY'
import json, sys
from pathlib import Path

try:
    m = json.loads(Path(sys.argv[1]).read_text())
    for key in ("name", "uuid", "version", "version-name",
                "shell-version", "url", "settings-schema",
                "gettext-domain"):
        if key in m:
            print(f"{key}: {m[key]}")
except Exception as e:
    print(f"METADATA ERROR: {e}")
PY
        else
            echo "WARNING: metadata.json missing"
        fi

        echo "Bundled schema definitions:"
        find "$dir" -type f -name '*.gschema.xml' -print

        echo "Declared external dependencies:"
        python3 - "$dir" <<'PY'
import json, sys
from pathlib import Path

root = Path(sys.argv[1])
mfile = root / "metadata.json"
if mfile.exists():
    try:
        m = json.loads(mfile.read_text())
        for key in ("dependencies", "session-modes",
                    "shell-version", "settings-schema"):
            if key in m:
                print(f"  {key}: {m[key]}")
    except Exception:
        pass
PY

    done < "$OUT/enabled-extensions.txt"

    echo
    echo "=== Potential external-resource references ==="
    echo "Review these matches manually; they are not proof of a dependency."

    grep -RInE \
      --include='*.js' --include='*.json' \
      --include='*.py' --include='*.sh' \
      --include='*.xml' --include='*.desktop' \
      '(/usr/local/|/opt/|/etc/|/home/|Gio\.Subprocess|GLib\.spawn|spawn_command_line|Gio\.DBus|org\.freedesktop|/usr/bin/|/bin/)' \
      "$EXT_DIR" 2>/dev/null || true

    echo
    echo "=== Installed package ownership ==="
    if command -v dpkg-query >/dev/null 2>&1; then
        while IFS= read -r uuid; do
            [ -n "$uuid" ] || continue
            for dir in \
                "$HOME/.local/share/gnome-shell/extensions/$uuid" \
                "/usr/share/gnome-shell/extensions/$uuid"; do
                [ -d "$dir" ] || continue
                dpkg-query -S "$dir/metadata.json" 2>/dev/null || true
            done
        done < "$OUT/enabled-extensions.txt"
    fi

} > "$REPORT"

echo "Audit saved to: $REPORT"
echo "Review unresolved references and missing dependencies."
