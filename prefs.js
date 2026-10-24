// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GammaSaturationPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        window.set_default_size(560, 520);

        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Colour'),
            description: _('Changes are applied to the whole screen immediately.'),
        });
        page.add(group);

        const saturationAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1,
            page_increment: 10,
            value: settings.get_double('saturation') * 100,
        });

        const saturationRow = new Adw.SpinRow({
            title: _('Saturation'),
            subtitle: _('100% is neutral. Try 120–140% if your screen looks washed out.'),
            adjustment: saturationAdjustment,
            digits: 0,
            climb_rate: 1,
        });
        group.add(saturationRow);

        const gammaAdjustment = new Gtk.Adjustment({
            lower: 0.5,
            upper: 2.5,
            step_increment: 0.01,
            page_increment: 0.1,
            value: settings.get_double('gamma'),
        });

        const gammaRow = new Adw.SpinRow({
            title: _('Gamma'),
            subtitle: _('1.00 is neutral. Values above 1.00 brighten the midtones.'),
            adjustment: gammaAdjustment,
            digits: 2,
            climb_rate: 0.01,
        });
        group.add(gammaRow);

        saturationAdjustment.connect('value-changed', () => {
            settings.set_double('saturation', saturationAdjustment.get_value() / 100);
        });

        gammaAdjustment.connect('value-changed', () => {
            settings.set_double('gamma', gammaAdjustment.get_value());
        });

        // Keep the controls in sync if the settings are changed elsewhere
        // (for example by the reset button or gsettings on the command line).
        const saturationChangedId = settings.connect('changed::saturation', () => {
            saturationAdjustment.set_value(settings.get_double('saturation') * 100);
        });
        const gammaChangedId = settings.connect('changed::gamma', () => {
            gammaAdjustment.set_value(settings.get_double('gamma'));
        });

        window.connect('close-request', () => {
            settings.disconnect(saturationChangedId);
            settings.disconnect(gammaChangedId);
            return false;
        });

        const resetGroup = new Adw.PreferencesGroup();
        page.add(resetGroup);

        const resetRow = new Adw.ActionRow({
            title: _('Reset to defaults'),
            subtitle: _('Saturation 100%, gamma 1.00.'),
        });

        const resetButton = new Gtk.Button({
            label: _('Reset'),
            valign: Gtk.Align.CENTER,
        });
        resetButton.connect('clicked', () => {
            settings.reset('saturation');
            settings.reset('gamma');
        });

        resetRow.add_suffix(resetButton);
        resetRow.activatable_widget = resetButton;
        resetGroup.add(resetRow);

        const screenshotGroup = new Adw.PreferencesGroup({
            title: _('Screenshots'),
        });
        page.add(screenshotGroup);

        screenshotGroup.add(new Adw.ActionRow({
            title: _('If a screenshot is incomplete'),
            subtitle: _('Press Alt+9 to pause the effect, take the screenshot again, then press Alt+9 to switch it back on. The shortcut can be changed in Settings → Keyboard → Custom Shortcuts.'),
        }));

        const aboutGroup = new Adw.PreferencesGroup({
            title: _('About'),
        });
        page.add(aboutGroup);

        aboutGroup.add(new Adw.ActionRow({
            title: _('Version'),
            subtitle: this.metadata['version-name'] ?? '1.0.3',
        }));

        aboutGroup.add(new Adw.ActionRow({
            title: _('Licence'),
            subtitle: 'GPL-2.0-or-later',
        }));

        aboutGroup.add(new Adw.ActionRow({
            title: _('Project page'),
            subtitle: this.metadata.url ?? 'https://github.com/Mazen-Harbi/gamma-saturation-control',
        }));
    }
}
