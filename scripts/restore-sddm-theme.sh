#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/assets/system/usr/share/sddm/themes/amartya-os"
DEST="/usr/share/sddm/themes/amartya-os"

APPLY=0
FORCE=0

usage() {
    echo "Usage: $0 [--apply] [--force]"
    echo "Default: dry-run; no system files are changed."
    echo "--apply   perform the restoration"
    echo "--force   allow replacement of files that differ from the backup"
}

for arg in "$@"; do
    case "$arg" in
        --apply) APPLY=1 ;;
        --force) FORCE=1 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
    esac
done

FILES=(Main.qml metadata.desktop assets/SDDM.png)

echo "Amartya OS SDDM Theme Restore"
echo "Source:      $SOURCE"
echo "Destination: $DEST"
echo "Mode:        $([[ "$APPLY" == 1 ]] && echo APPLY || echo DRY-RUN)"
echo

# Validate every source file before making any changes.
for file in "${FILES[@]}"; do
    if [[ ! -f "$SOURCE/$file" ]]; then
        echo "ERROR: Missing backup file: $SOURCE/$file" >&2
        exit 1
    fi
done

# Compare against the current live theme when available.
for file in "${FILES[@]}"; do
    src="$SOURCE/$file"
    dst="$DEST/$file"

    if [[ -e "$dst" ]]; then
        if cmp -s -- "$src" "$dst"; then
            echo "[UNCHANGED] $file"
        elif (( FORCE )); then
            echo "[REPLACE - FORCE] $file"
        else
            echo "[CONFLICT] $file differs from backup."
            echo "           Refusing to overwrite without --force."
            exit 1
        fi
    else
        echo "[NEW FILE] $file"
    fi
done

if (( ! APPLY )); then
    echo
    echo "DRY-RUN complete. Nothing was changed."
    echo "Review the plan, then use --apply to restore."
    exit 0
fi

if (( EUID != 0 )); then
    echo "ERROR: Apply mode requires root privileges." >&2
    echo "Run: sudo $0 --apply"
    echo "For conflicts, review them first before considering --force."
    exit 1
fi

# Preserve existing destination files before replacing anything.
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/amartya-os-sddm/$STAMP"
NEEDS_BACKUP=0

for file in "${FILES[@]}"; do
    dst="$DEST/$file"
    if [[ -e "$dst" ]] && ! cmp -s -- "$SOURCE/$file" "$dst"; then
        NEEDS_BACKUP=1
    fi
done

if (( NEEDS_BACKUP )); then
    mkdir -p "$BACKUP_DIR"
    for file in "${FILES[@]}"; do
        dst="$DEST/$file"
        if [[ -e "$dst" ]] && ! cmp -s -- "$SOURCE/$file" "$dst"; then
            mkdir -p "$BACKUP_DIR/$(dirname "$file")"
            cp -a -- "$dst" "$BACKUP_DIR/$file"
        fi
    done
    echo "Previous files saved under: $BACKUP_DIR"
fi

mkdir -p "$DEST"

for file in "${FILES[@]}"; do
    src="$SOURCE/$file"
    dst="$DEST/$file"

    if [[ -e "$dst" ]] && cmp -s -- "$src" "$dst"; then
        echo "[SKIP] $file is already identical."
        continue
    fi

    if [[ -e "$dst" ]] && (( ! FORCE )); then
        echo "ERROR: Conflict detected during restore: $dst" >&2
        exit 1
    fi

    mkdir -p "$(dirname "$dst")"
    install -o root -g root -m 0644 -- "$src" "$dst"
    echo "[RESTORED] $file"
done

echo
echo "Restore finished. No display-manager restart was performed."
echo "Verify the login screen before making any further changes."
