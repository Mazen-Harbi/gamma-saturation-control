#!/usr/bin/env bash
# ============================================================================
#  install.sh — install Gamma & Saturation Control for the current user.
# ----------------------------------------------------------------------------
#      ./install.sh                 install (or update) the extension
#      ./install.sh --with-pause    also install the "pause for a screenshot"
#                                   helper and its Alt+9 shortcut
#
#  Wayland sessions only load newly installed extensions after a new login,
#  so log out and back in once, then run:
#      gnome-extensions enable gamma-saturation@mazen-harbi.github.io
# ============================================================================
set -euo pipefail

UUID="gamma-saturation@mazen-harbi.github.io"
SCHEMA_ID="org.gnome.shell.extensions.gamma-saturation"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}"
DEST_DIR="$DATA_DIR/gnome-shell/extensions/$UUID"
BIN_DIR="$HOME/.local/bin"
WITH_PAUSE=0

for arg in "$@"; do
    case "$arg" in
    --with-pause) WITH_PAUSE=1 ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
    esac
done

mkdir -p "$DEST_DIR/schemas"

cp -f "$SOURCE_DIR/extension.js" "$DEST_DIR/"
cp -f "$SOURCE_DIR/effect.js" "$DEST_DIR/"
cp -f "$SOURCE_DIR/prefs.js" "$DEST_DIR/"
cp -f "$SOURCE_DIR/metadata.json" "$DEST_DIR/"
cp -f "$SOURCE_DIR/schemas/$SCHEMA_ID.gschema.xml" "$DEST_DIR/schemas/"

glib-compile-schemas "$DEST_DIR/schemas"

echo "Installed to: $DEST_DIR"

if [ "$WITH_PAUSE" -eq 1 ]; then
    mkdir -p "$BIN_DIR"
    install -m 755 "$SOURCE_DIR/gamma-saturation-pause.sh" "$BIN_DIR/gamma-saturation-pause"
    python3 - <<'PY'
import os
from gi.repository import Gio

base = Gio.Settings.new('org.gnome.settings-daemon.plugins.media-keys')
path = '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/gamma-saturation-pause/'
cur = list(base.get_strv('custom-keybindings'))

kb = Gio.Settings.new_with_path(
    'org.gnome.settings-daemon.plugins.media-keys.custom-keybinding', path)
kb.set_string('name', 'Gamma & Saturation Control: pause for a screenshot')
kb.set_string('command', os.path.expanduser('~/.local/bin/gamma-saturation-pause'))
kb.set_string('binding', '<Alt>9')
kb.sync()

if path not in cur:
    base.set_strv('custom-keybindings', cur + [path])
    base.sync()

print(f'pause shortcut installed: Alt+9  ({path})')
PY
    echo "Pause helper:  $BIN_DIR/gamma-saturation-pause   (Alt+9)"
fi

echo
echo "Now log out of GNOME and log back in (Wayland requires this for newly"
echo "installed extensions), then run:"
echo
echo "    gnome-extensions enable $UUID"
echo
echo "To open the settings window:"
echo
echo "    gnome-extensions prefs $UUID"
