#!/usr/bin/env bash
set -u

REPORT="manifests/external-asset-candidates.tsv"
mkdir -p manifests

printf 'source\tpath\texists\tpackage_owner\tclassification\n' > "$REPORT"

check_path() {
    local source="$1"
    local path="$2"
    local exists="no"
    local owner="not-package-owned-or-unknown"
    local classification="review"

    [[ -f "$path" ]] && exists="yes"

    if command -v dpkg-query >/dev/null 2>&1; then
        local result
        result="$(dpkg-query -S "$path" 2>/dev/null | head -n 1 || true)"
        [[ -n "$result" ]] && owner="$result"
    fi

    if [[ "$path" == /usr/share/amartya-os/* ]] &&
       [[ "$exists" == yes ]] &&
       [[ "$owner" == not-package-owned-or-unknown ]]; then
        classification="custom-system-asset"
    elif [[ "$owner" != not-package-owned-or-unknown ]]; then
        classification="package-owned-system-asset"
    elif [[ "$exists" == yes ]]; then
        classification="existing-unowned-file"
    fi

    printf '%s\t%s\t%s\t%s\t%s\n' \
        "$source" "$path" "$exists" "$owner" "$classification" >> "$REPORT"
}

# Paths explicitly configured in settings.
while IFS= read -r path; do
    [[ "$path" == /* ]] || continue
    [[ "$path" != *'$'* ]] || continue
    check_path "settings" "$path"
done < <(
    grep -rhoE "/[^'\"[:space:]]+\.(png|svg|jpg|jpeg|webp|ico)" \
        settings config 2>/dev/null | sort -u
)

# Only genuine absolute paths in extension source.
# Skip variable interpolation and paths with repeated leading slashes.
while IFS= read -r path; do
    [[ "$path" == /* ]] || continue
    [[ "$path" != //* ]] && [[ "$path" != *'$'* ]] || continue

    # Only inspect known shared/system locations, not extension-relative assets.
    case "$path" in
        /usr/share/*|/opt/*|/home/*) check_path "extension-source" "$path" ;;
    esac
done < <(
    grep -rhoE "/[^'\"[:space:]()]+\.(png|svg|jpg|jpeg|webp|ico)" \
        backup/extensions \
        --include='*.js' --include='*.mjs' --include='*.json' \
        --include='*.css' --include='*.xml' --include='*.ui' \
        2>/dev/null | sort -u
)

echo "Report written to: $REPORT"
echo
column -s $'\t' -t "$REPORT" 2>/dev/null || cat "$REPORT"
