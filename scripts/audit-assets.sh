#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/manifests/asset-audit.txt"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

{
    echo "AMARTYA OS — DEPENDENCY-DRIVEN ASSET AUDIT"
    echo "Generated: $(date -Is)"
    echo "Repository: $ROOT"
    echo
    echo "=== 1. Explicit custom asset paths in settings ==="

    if [[ -f "$ROOT/settings/dash-to-panel.dconf" ]]; then
        grep -nE '=.*(/|file://).*\.(png|jpe?g|svg|webp|gif|ico|ttf|otf|woff2?)([[:space:]'\''"]|$)' \
          "$ROOT/settings/dash-to-panel.dconf" || true
    fi

    echo
    echo "=== 2. Asset references in extension source/config ==="

    grep -RInE \
      '(file://[^"'\'' )]+|/[^"'\'' )]+\.(png|jpe?g|svg|webp|gif|ico|ttf|otf|woff2?|json|css)|["'\''`][^"'\''` ]+\.(png|jpe?g|svg|webp|gif|ico|ttf|otf|woff2?)([?#][^"'\''`]*)?["'\''`])' \
      "$ROOT/backup/extensions" \
      --include='*.js' --include='*.mjs' --include='*.json' \
      --include='*.css' --include='*.xml' --include='*.ui' \
      --include='*.conf' --include='*.ini' --include='*.sh' \
      2>/dev/null || true

    echo
    echo "=== 3. Asset-like files already included in the backup ==="

    find "$ROOT/backup/extensions" -type f \
      \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \
         -o -iname '*.svg' -o -iname '*.webp' -o -iname '*.gif' \
         -o -iname '*.ico' -o -iname '*.ttf' -o -iname '*.otf' \
         -o -iname '*.woff' -o -iname '*.woff2' \) -print 2>/dev/null

    echo
    echo "=== 4. Branding and asset directories on this machine ==="

    for dir in \
      /usr/share/amartya-os \
      /usr/share/icons \
      /usr/share/pixmaps \
      "$HOME/.local/share/gnome-shell/extensions" \
      "$HOME/.local/share/icons" \
      "$HOME/.themes"
    do
        if [[ -d "$dir" ]]; then
            find "$dir" -type f \
              \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \
                 -o -iname '*.svg' -o -iname '*.webp' -o -iname '*.gif' \
                 -o -iname '*.ico' -o -iname '*.ttf' -o -iname '*.otf' \
                 -o -iname '*.woff' -o -iname '*.woff2' \) \
              -print 2>/dev/null
        fi
    done
} > "$TMP"

mv "$TMP" "$OUT"
trap - EXIT

echo "Asset audit saved to: $OUT"
echo "This is an inventory only; no files were copied or changed."
