#!/usr/bin/env bash
# ============================================================================
#  build.sh — build the distributable GNOME Shell extension bundle.
# ----------------------------------------------------------------------------
#      ./build.sh
#          → dist/gamma-saturation@mazen-harbi.github.io.shell-extension.zip
#
#  The result is exactly what extensions.gnome.org expects, and it can also
#  be installed locally with:
#      gnome-extensions install --force dist/*.zip
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

UUID="$(sed -n 's/.*"uuid":[[:space:]]*"\([^"]*\)".*/\1/p' metadata.json | head -n1)"
[ -n "$UUID" ] || { echo "error: could not read 'uuid' from metadata.json" >&2; exit 1; }

SCHEMA="schemas/org.gnome.shell.extensions.gamma-saturation.gschema.xml"
DIST="dist"
ZIP="$DIST/$UUID.shell-extension.zip"

echo "→ compiling GSettings schema"
glib-compile-schemas schemas/

rm -rf "$DIST"
mkdir -p "$DIST"

if command -v gnome-extensions >/dev/null 2>&1; then
    echo "→ packing with gnome-extensions"
    gnome-extensions pack \
        --schema="$SCHEMA" \
        --extra-source=effect.js \
        --extra-source=LICENSE \
        --force \
        --out-dir="$DIST" \
        .
else
    echo "→ packing with zip (gnome-extensions not found)"
    zip -q -j "$ZIP" metadata.json extension.js effect.js prefs.js LICENSE
    zip -q "$ZIP" "$SCHEMA"
fi

echo
echo "✓ built  $ZIP"
unzip -l "$ZIP" 2>/dev/null | sed -n '2,20p' || true
