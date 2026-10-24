#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
#
# Pause / resume the Gamma & Saturation Control effect for a moment (for
# example to take a screenshot). It only flips the extension's own settings
# to neutral and back; nothing inside GNOME Shell is touched and nothing is
# reloaded.
#
# Usage: gamma-saturation-pause            (toggles)
#        gamma-saturation-pause status     (prints the current state)

set -u

DATA="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions"
STATE="${XDG_RUNTIME_DIR:-/tmp}/gsc-paused.state"
SCHEMA=""
SCHEMA_DIR=""

# Pick the settings schema of the extension that is actually enabled. The
# other entries are older names of this same extension, so the helper keeps
# working on machines that have not switched to the current uuid yet.
enabled_list="$(gnome-extensions list --enabled 2>/dev/null || true)"

pick() { # args: uuid schema-id
    local uuid="$1" schema_id="$2"
    [ -d "$DATA/$uuid/schemas" ] || return 1
    grep -qx "$uuid" <<<"$enabled_list" || return 1
    SCHEMA="$schema_id"
    SCHEMA_DIR="$DATA/$uuid/schemas"
    return 0
}

pick "gamma-saturation@mazen-harbi.github.io" "org.gnome.shell.extensions.gamma-saturation" ||
pick "vibrance@mazen.local" "org.gnome.shell.extensions.vibrance" ||
{ SCHEMA="org.gnome.shell.extensions.gamma-saturation"
  SCHEMA_DIR="$DATA/gamma-saturation@mazen-harbi.github.io/schemas"; }

export GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR"

notify() {
    if command -v notify-send >/dev/null 2>&1; then
        notify-send -a "Gamma & Saturation" -i video-display -t 2500 "$1" "$2" >/dev/null 2>&1 && return
    fi
    # Fallback: talk to the notification daemon directly (no libnotify needed).
    gdbus call --session --dest org.freedesktop.Notifications \
        --object-path /org/freedesktop/Notifications \
        --method org.freedesktop.Notifications.Notify \
        "Gamma & Saturation" 0 "video-display" "$1" "$2" "[]" "{}" 2500 \
        >/dev/null 2>&1 || true
}

if ! gsettings get "$SCHEMA" saturation >/dev/null 2>&1; then
    notify "Gamma & Saturation" "The extension is not installed or not enabled."
    echo "error: settings schema not available" >&2
    exit 1
fi

sat="$(gsettings get "$SCHEMA" saturation)"
gam="$(gsettings get "$SCHEMA" gamma)"

neutral() { # args: sat gamma ; true if both are ~1.0
    awk -v s="$1" -v g="$2" 'BEGIN { exit !((s-1)*(s-1) < 1e-8 && (g-1)*(g-1) < 1e-8) }'
}

case "${1:-toggle}" in
status)
    if [ -f "$STATE" ]; then
        echo "paused (saved: $(cat "$STATE")) [$SCHEMA]"
    else
        echo "active (sat=$sat gamma=$gam) [$SCHEMA]"
    fi
    exit 0
    ;;
esac

if [ -f "$STATE" ]; then
    # ---- resume ----
    if ! neutral "$sat" "$gam"; then
        # Values were changed while paused: keep what the user chose.
        rm -f "$STATE"
        notify "Gamma & Saturation" "Back on — keeping your new values."
        exit 0
    fi
    psat=""
    pgam=""
    read -r psat pgam < "$STATE" || true
    [ -n "$psat" ] && gsettings set "$SCHEMA" saturation "$psat"
    [ -n "$pgam" ] && gsettings set "$SCHEMA" gamma "$pgam"
    rm -f "$STATE"
    notify "Gamma & Saturation" "Back on ✅"
else
    # ---- pause ----
    printf '%s %s\n' "$sat" "$gam" > "$STATE"
    gsettings set "$SCHEMA" saturation 1.0
    gsettings set "$SCHEMA" gamma 1.0
    notify "Gamma & Saturation" "Paused — take your screenshot, then press the shortcut again."
fi
