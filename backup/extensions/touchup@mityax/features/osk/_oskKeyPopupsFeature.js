import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Keyboard from 'resource:///org/gnome/shell/ui/keyboard.js';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import ExtensionFeature from '../../core/extensionFeature.js';
import { settings } from '../../settings.js';
import { Delay } from '../../utils/delay.js';
import { extractKeyPrototype } from './_oskUtils.js';
import { findAllActorsBy, SHELL_VERSION } from '../../utils/shellUtils.js';
import { Column, Label } from '../../utils/ui/widgets.js';

class OSKKeyPopupFeature extends ExtensionFeature {
    _keyPopupsCache = new Map();
    _subpm = null;
    constructor(pm, keyboard) {
        super(pm);
        // Destroy all cached popups on style change:
        this.pm.connectTo(settings.osk.keyPopups.style, 'changed', () => {
            this._keyPopupsCache.forEach((popup) => popup.destroy());
            this._keyPopupsCache.clear();
        });
        if (keyboard !== null) {
            this.onNewKeyboard(keyboard);
        }
        // Recreate our patches whenever the keyboard is rebuilt:
        const self = this;
        this.pm.appendToMethod(Keyboard.Keyboard.prototype, '_updateKeys', function () {
            self.onNewKeyboard(this);
        });
    }
    _patchKeys(keyboard) {
        // Extract all `Key` instances:
        const keyProto = extractKeyPrototype(keyboard);
        const keys = findAllActorsBy(keyboard, a => keyProto.isPrototypeOf(a));
        for (const key of keys) {
            const commitString = key.keyButton.label;
            // If the key has no commitString (inferred from its label) or has an action assigned, it doesn't
            // get a popup:
            if (key._hasAction || !commitString?.trim()) {
                continue;
            }
            // We base the `KeyPopup` open state upon the key buttons "active" pseudo-class instead of its `pressed`
            // state, as this allows the key popup to be synthetically triggered by the extended keys feature and also
            // is quite appropriate given the purely cosmetic nature of key popups:
            let hasActivePseudo = false; // keep track of "active" pseudo class manually, since other classes (like "hover") trigger the same signal
            this._subpm.connectTo(key.keyButton, "notify::pseudo-class", (_) => {
                const prevHasActivePseudo = hasActivePseudo;
                hasActivePseudo = key.keyButton.has_style_pseudo_class("active");
                /** @deprecated GNOME Shell < 51 */
                const isPressedLegacy = key._pressed && key.keyButton.hover; // add `hover` guard since this handler is only called on pseudo-class changes, not after the button is actually released
                const isPressed = SHELL_VERSION < [51]
                    ? isPressedLegacy
                    : !prevHasActivePseudo && hasActivePseudo;
                const isReleased = SHELL_VERSION < [51]
                    ? !isPressedLegacy
                    : prevHasActivePseudo && !hasActivePseudo;
                const popupIsOpen = this._keyPopupsCache.get(key)?.isOpen;
                // Lazily create the key popup when a key is pressed:
                if (isPressed && !popupIsOpen) {
                    if (!this._keyPopupsCache.get(key)) {
                        this._createKeyPopup(key, commitString);
                    }
                    this._keyPopupsCache.get(key)?.open();
                    Delay.ms(2000).then(() => {
                        this._keyPopupsCache.get(key)?.close();
                    });
                    // Close popups when a key is released:
                }
                else if (isReleased && popupIsOpen) {
                    Delay.ms(settings.osk.keyPopups.duration.get()).then(() => {
                        this._keyPopupsCache.get(key)?.close();
                    });
                }
            });
            // Hide key popup when subkeys are shown (i.e. long pressing a key):
            if (key._menu) {
                this._subpm.connectTo(key._menu, "open", () => {
                    // @ts-ignore
                    self._keyPopupsCache.get(key)?.close();
                });
            }
        }
    }
    _createKeyPopup(key, commitString) {
        const popup = new KeyPopup({
            sourceActor: key,
            label: commitString,
        });
        this._keyPopupsCache.set(key, popup);
        // When the popup is destroyed (which it is automatically, when the key it's attached to is),
        // remove it from the cache and drop this patch (to not destroy again later):
        this.pm.connectTo(popup, 'destroy', () => this._keyPopupsCache.delete(key)); // notice: pm is just used to make Shexli happy (not needed here as popups are destroyed anyways when the extension is disabled) :)
        // Destroy the popup on extension (or feature) disabling:
        this.pm.autoDestroy(popup);
        return popup;
    }
    onNewKeyboard(keyboard) {
        // Use a singleton child `PatchManager` to reliably ensure we never operate twice on a keyboard:
        this._subpm?.destroy();
        this._subpm = this.pm.fork("subpm");
        this._patchKeys(keyboard);
    }
}
class KeyPopup extends Column {
    static {
        GObject.registerClass(this);
    }
    _sourceActor;
    _label;
    _open = false;
    constructor(props) {
        super({
            styleClass: [
                'touchup-osk-key-popup',
                `touchup-osk-key-popup--${settings.osk.keyPopups.style.get()}`,
                'keyboard-key'
            ], // inherit default key style via `keyboard-key` (color is overwritten in CSS)
            notifyMapped: () => this._relayout(),
        });
        this._sourceActor = props.sourceActor;
        this._label = new Label({
            text: props.label,
            yAlign: Clutter.ActorAlign.START,
            xAlign: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._label);
        // @ts-ignore: type hints for `connectObject` missing
        this._sourceActor.connectObject('notify::allocation', () => this._relayout(), 'notify::mapped', () => this._updateOpen(), 'destroy', () => this.destroy(), this);
    }
    _relayout() {
        const sourceExtents = this._sourceActor.get_transformed_extents();
        const width = Math.max(sourceExtents.get_width(), this._label.width);
        const height = sourceExtents.get_height() + this._label.height;
        this.set_size(width, height);
        this.set_position(sourceExtents.get_x() + sourceExtents.get_width() / 2 - width / 2, sourceExtents.get_y() - this._label.height);
    }
    open() {
        this._open = true;
        this._updateOpen();
    }
    close() {
        this._open = false;
        this._updateOpen();
    }
    get isOpen() {
        return this._open;
    }
    get _isActuallyOpen() {
        return this.get_parent() !== null;
    }
    get _shouldBeOpen() {
        return this._open && this._sourceActor.mapped;
    }
    _updateOpen() {
        if (this._shouldBeOpen && !this._isActuallyOpen) {
            Main.layoutManager.addTopChrome(this);
        }
        else if (!this._shouldBeOpen && this._isActuallyOpen) {
            Main.layoutManager.removeChrome(this);
        }
    }
    vfunc_pick(pick_context) {
        // By not making any call to this.pick_box(...) here, we make this actor pass through all events to
        // any actor potentially below it.
        return;
    }
}

export { OSKKeyPopupFeature };
