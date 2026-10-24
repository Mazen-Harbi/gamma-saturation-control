// SPDX-License-Identifier: GPL-2.0-or-later
//
// Gamma & Saturation Control — screen-wide saturation and gamma.
//
// The effect is attached to the top-level UI group, so it covers windows,
// the desktop background, the top bar and shell dialogs alike.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {GammaSaturationEffect} from './effect.js';

export default class GammaSaturationExtension extends Extension {
    constructor(metadata) {
        super(metadata);

        this._settings = null;
        this._effect = null;
        this._settingsChangedId = 0;
        this._unredirectDisabled = false;
    }

    enable() {
        this._settings = this.getSettings();

        this._effect = new GammaSaturationEffect();
        Main.layoutManager.uiGroup.add_effect(this._effect);

        // Fullscreen windows normally bypass the compositor (direct
        // scanout), which would also bypass this effect. Keep them
        // composited for as long as the extension is enabled.
        if (typeof global.compositor?.disable_unredirect === 'function') {
            global.compositor.disable_unredirect();
            this._unredirectDisabled = true;
        }

        this._settingsChangedId = this._settings.connect('changed', () => this._sync());

        this._sync();
    }

    _sync() {
        if (!this._effect || !this._settings)
            return;

        const saturation = this._settings.get_double('saturation');
        const gamma = this._settings.get_double('gamma');

        this._effect.setColorParams(saturation, gamma);

        // Neutral settings should cost nothing at all: no offscreen
        // redirection happens while the effect is disabled.
        const active = Math.abs(saturation - 1.0) > 0.0001 ||
            Math.abs(gamma - 1.0) > 0.0001;

        this._effect.enabled = active;

        if (active)
            this._effect.queue_repaint();
    }

    disable() {
        if (this._settingsChangedId) {
            this._settings?.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        if (this._effect) {
            Main.layoutManager.uiGroup.remove_effect(this._effect);
            this._effect = null;
        }

        if (this._unredirectDisabled) {
            global.compositor?.enable_unredirect();
            this._unredirectDisabled = false;
        }

        this._settings = null;
    }
}
