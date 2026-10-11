//Copyright (C) 2026 Laurento Frittella

//This file is part of Preserve Battery QuickToggle GNOME shell extension.

//Preserve Battery QuickToggle is an evolution of my previous extension
//"Lenovo IdeaPad goodies". Since kernel 6.16, the battery conservation mode
//available on Lenovo IdeaPad laptops has been using the new charge_types API
//(see: https://vdwaa.nl/charge-types-api-upower.html). I created this
//new extension to take advantage of this standardization, allowing it
//to support a wider variety of laptops.

//Preserve Battery QuickToggle is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//Preserve Battery QuickToggle is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with Preserve Battery QuickToggle. If not, see <http://www.gnu.org/licenses/>.

//Author: Laurento Frittella <laurento.frittella at gmail dot com>

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

const UPowerDeviceIface = `
<node>
  <interface name="org.freedesktop.UPower.Device">
    <property name="ChargeThresholdSupported" type="b" access="read"/>
    <property name="ChargeThresholdEnabled" type="b" access="read"/>
    <method name="EnableChargeThreshold">
      <arg type="b" direction="in"/>
    </method>
  </interface>
</node>`;

const ConservationToggle = GObject.registerClass(
class ConservationToggle extends QuickSettings.QuickToggle {
    constructor(available = true) {
        super({
            title: _('Preserve Battery'),
            iconName: (available) ? 'emoji-nature-symbolic' : 'battery-level-0-symbolic',
            toggleMode: (available) ? true : false,
        });
    }
});

const ConservationIndicator = GObject.registerClass(
class ConservationIndicator extends QuickSettings.SystemIndicator {
    constructor(proxy) {
        super();

        // Create the icon for the indicator
        this._indicator = this._addIndicator();
        this._indicator.icon_name = 'emoji-nature-symbolic';
        this._toggle = null;
        this._proxy = proxy;
        this._signalId = null;

        if (this._proxy !== null) {
            // Create the toggle.
            this._toggle = new ConservationToggle();
            this._toggle.connect('clicked', item => {
                this._setConservationMode(item.get_checked());
            });

            this._signalId = proxy.connect('g-properties-changed', (p, changed) => {             
                if ('ChargeThresholdEnabled' in changed.recursiveUnpack()) {
                    this._syncStatus();
                }
            });

            // Set the initial and proper indicator status.
            this._syncStatus();
        } else {
            // Use the toggle to signal the error.
            this._toggle = new ConservationToggle(false);
            this._indicator.visible = false;
        }

        this.quickSettingsItems.push(this._toggle);
        // Add the indicator to the panel and the toggle to the menu.
        Main.panel.statusArea.quickSettings.addExternalIndicator(this);
    }

    _syncStatus() {
        const active = this._proxy.ChargeThresholdEnabled;
        this._indicator.visible = active;
        this._toggle.set_checked(active);
    }

    _setConservationMode(enabled) {
        this._proxy.EnableChargeThresholdRemote(enabled, (result, error) => {
            if (error) {
                console.error(`[Error] Failed to enable conservation mode: ${error.message}`);
            }
        });
    }

    destroy() {
        // Destroy the toggle along with the indicator.
        this.quickSettingsItems.forEach(item => item?.destroy());

        // Disconnect from signals.
        this._proxy?.disconnect(this._signalId);
        this._signalId = null;

        super.destroy();
    }
});

export default class IdeaPadUPowerExtension extends Extension {
    constructor(metadata) {
        super(metadata);

        this._indicator = null;
        this._batteryProxy = null;
    }

    async enable() {
        const UPowerDeviceProxy = Gio.DBusProxy.makeProxyWrapper(UPowerDeviceIface);

        try {
            // Get all device paths
            const [devicePaths] = (await Gio.DBus.system.call(
                'org.freedesktop.UPower',
                '/org/freedesktop/UPower',
                'org.freedesktop.UPower',
                'EnumerateDevices',
                null, null, Gio.DBusCallFlags.NONE, -1, null
            )).recursiveUnpack();

            const batteryPaths = devicePaths.filter(path => path.includes('battery'));

            for (const path of batteryPaths) {
                let proxy = new UPowerDeviceProxy(Gio.DBus.system, 'org.freedesktop.UPower', path);

                if (proxy.ChargeThresholdSupported) {
                    console.log(`Monitoring battery: ${path}`);

                    this._batteryProxy = proxy;
                    this._indicator = new ConservationIndicator(this._batteryProxy);

                    // Stop at the first compatible battery
                    break;
                }
            }

            if (!this._batteryProxy) {
                console.log(
                    'No batteries compatible with this extension detected. ' +
                    'For Lenovo IdeaPad users kernel 6.16+ is required!'
                );
            }

        } catch (e) {
            console.error(`Error enabling the extension: ${e.message}`);
        }
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
        this._batteryProxy = null;
    }
}
