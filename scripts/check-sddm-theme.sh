#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT/manifests/sddm-theme-dependencies.txt"

if [[ ! -f "$MANIFEST" ]]; then
    echo "ERROR: Dependency manifest not found: $MANIFEST" >&2
    exit 1
fi

failures=0
section=""

echo "Amartya OS SDDM Theme — Dependency Check"
echo "Repository: $ROOT"
echo

while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"

    [[ -z "$line" || "$line" == \#* ]] && continue

    if [[ "$line" == \[*\] ]]; then
        section="$line"
        continue
    fi

    case "$section" in
        "[required-packages]")
            if dpkg-query -W -f='${Status}' "$line" 2>/dev/null |
               grep -q 'install ok installed'; then
                printf '[OK]      Package: %s\n' "$line"
            else
                printf '[MISSING] Package: %s\n' "$line"
                failures=$((failures + 1))
            fi
            ;;
        "[active-theme-files]")
            path="$ROOT/assets/system$line"
            if [[ -f "$path" ]]; then
                printf '[OK]      Backup:  %s\n' "$line"
            else
                printf '[MISSING] Backup:  %s\n' "$line"
                failures=$((failures + 1))
            fi
            ;;
    esac
done < "$MANIFEST"

echo
if (( failures == 0 )); then
    echo "PASS: All declared packages and theme backups are present."
else
    echo "FAIL: $failures check(s) need attention."
    exit 1
fi
