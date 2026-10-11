import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import { settings } from '../../../settings.js';
import { buildPreferencesGroup, buildSwitchRow } from '../uiUtils.js';

class MiscPage extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }
    constructor() {
        super({
            name: 'misc',
            title: "Other",
            icon_name: "preferences-other-symbolic",
        });
        this.add(buildPreferencesGroup({
            title: "Floating Screen Rotate Button",
            description: "When auto-rotate is off, rotating your device triggers a temporary floating button in the " +
                "corner of the screen, offering a quick way to adjust orientation.",
            children: [
                buildSwitchRow({
                    title: "Enable Floating Screen Rotate Button",
                    subtitle: "Toggle to enable or disable the floating screen rotate button feature",
                    setting: settings.screenRotateUtils.floatingScreenRotateButtonEnabled
                }),
            ]
        }));
    }
}

export { MiscPage };
