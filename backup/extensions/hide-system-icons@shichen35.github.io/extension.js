import GLib from "gi://GLib";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
const SETTING_KEYS = {
    microphone: 'hide-microphone',
    volume: 'hide-volume',
    bluetooth: 'hide-bluetooth',
    network: 'hide-network',
    power: 'hide-power',
    powerProfiles: 'hide-power-profiles',
};
const QS_FIELDS = {
    microphone: '_volumeInput',
    volume: '_volumeOutput',
    bluetooth: '_bluetooth',
    network: '_network',
    power: '_system',
    powerProfiles: '_powerProfiles',
};
const KINDS = ['microphone', 'volume', 'bluetooth', 'network', 'power', 'powerProfiles'];
class PanelState {
    qs;
    indicators = {
        microphone: null, volume: null, bluetooth: null, network: null, power: null, powerProfiles: null,
    };
    /** Kinds whose indicator currently has a notify::visible handler connected. */
    connectedKinds = new Set();
    container = null;
    containerWatched = false;
    constructor(qs) {
        this.qs = qs;
    }
}
export default class HideSystemIcons extends Extension {
    sourceId = null;
    settings = null;
    panelStates = [];
    enable() {
        this.settings = this.getSettings();
        for (const kind of KINDS) {
            this.settings.connectObject(`changed::${SETTING_KEYS[kind]}`, () => this.updateAll(), this);
        }
        this.scheduleApply();
    }
    scheduleApply() {
        if (this.sourceId !== null)
            return;
        let retries = 0;
        this.sourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this.setupAllPanels();
            for (const ps of this.panelStates)
                this.refreshIndicators(ps);
            const allReady = this.panelStates.length > 0 &&
                this.panelStates.every(ps => KINDS.every(kind => ps.indicators[kind] !== null));
            if (!allReady && ++retries < 50)
                return GLib.SOURCE_CONTINUE;
            this.updateAll();
            for (const ps of this.panelStates)
                this.attachRebuildWatch(ps);
            this.watchDtpPanels();
            this.sourceId = null;
            return GLib.SOURCE_REMOVE;
        });
    }
    disable() {
        if (this.sourceId !== null) {
            GLib.Source.remove(this.sourceId);
            this.sourceId = null;
        }
        if (this.settings) {
            this.settings.disconnectObject(this);
            this.settings = null;
        }
        this.unwatchDtpPanels();
        for (const ps of this.panelStates)
            this.cleanupPanelState(ps);
        this.panelStates = [];
    }
    getAllQuickSettings() {
        const result = [];
        const mainQs = Main.panel.statusArea?.quickSettings;
        if (mainQs)
            result.push(mainQs);
        // Dash to Panel creates separate quickSettings on secondary monitors
        const dtpPanels = global.dashToPanel?.panels;
        if (dtpPanels) {
            for (const p of dtpPanels) {
                const qs = p.statusArea?.quickSettings;
                if (qs && qs !== mainQs)
                    result.push(qs);
            }
        }
        return result;
    }
    setupAllPanels() {
        const allQs = this.getAllQuickSettings();
        const existingQs = new Set(this.panelStates.map(ps => ps.qs));
        for (const qs of allQs) {
            if (existingQs.has(qs))
                continue;
            const ps = new PanelState(qs);
            for (const kind of KINDS) {
                ps.indicators[kind] = (qs[QS_FIELDS[kind]] ?? null);
            }
            this.panelStates.push(ps);
        }
    }
    cleanupPanelState(ps) {
        this.detachRebuildWatch(ps);
        for (const kind of KINDS) {
            const indicator = ps.indicators[kind];
            if (!indicator)
                continue;
            if (ps.connectedKinds.has(kind))
                indicator.disconnectObject(ps);
            indicator.show();
            ps.indicators[kind] = null;
        }
        ps.connectedKinds.clear();
    }
    watchDtpPanels() {
        const dtp = global.dashToPanel;
        if (dtp)
            dtp.connectObject('panels-created', () => this.onDtpPanelsChanged(), this);
    }
    unwatchDtpPanels() {
        const dtp = global.dashToPanel;
        if (dtp)
            dtp.disconnectObject(this);
    }
    onDtpPanelsChanged() {
        const currentQs = new Set(this.getAllQuickSettings());
        const stale = this.panelStates.filter(ps => !currentQs.has(ps.qs));
        for (const ps of stale)
            this.cleanupPanelState(ps);
        this.panelStates = this.panelStates.filter(ps => currentQs.has(ps.qs));
        this.scheduleApply();
    }
    refreshIndicators(ps) {
        for (const kind of KINDS) {
            const newIndicator = (ps.qs[QS_FIELDS[kind]] ?? null);
            const oldIndicator = ps.indicators[kind];
            if (newIndicator !== oldIndicator) {
                if (oldIndicator && ps.connectedKinds.has(kind)) {
                    oldIndicator.disconnectObject(ps);
                    ps.connectedKinds.delete(kind);
                }
                ps.indicators[kind] = newIndicator;
            }
        }
        const container = ps.qs._indicators ?? ps.qs._grid ?? null;
        if (container !== ps.container) {
            this.detachRebuildWatch(ps);
            ps.container = container;
            this.attachRebuildWatch(ps);
        }
    }
    attachRebuildWatch(ps) {
        const container = ps.container ?? (ps.qs._indicators ?? ps.qs._grid ?? null);
        if (!container || ps.containerWatched)
            return;
        ps.container = container;
        container.connectObject('child-added', () => this.reapplyAll(ps), 'child-removed', () => this.reapplyAll(ps), ps);
        ps.containerWatched = true;
    }
    detachRebuildWatch(ps) {
        if (!ps.container || !ps.containerWatched)
            return;
        ps.container.disconnectObject(ps);
        ps.container = null;
        ps.containerWatched = false;
    }
    reapplyAll(ps) {
        this.refreshIndicators(ps);
        for (const kind of KINDS) {
            const hide = this.settings?.get_boolean(SETTING_KEYS[kind]) ?? false;
            this.applyHide(ps, kind, hide);
        }
    }
    updateAll() {
        for (const ps of this.panelStates) {
            this.refreshIndicators(ps);
            for (const kind of KINDS) {
                const hide = this.settings?.get_boolean(SETTING_KEYS[kind]) ?? false;
                this.applyHide(ps, kind, hide);
            }
        }
    }
    applyHide(ps, kind, hide) {
        const indicator = ps.indicators[kind];
        if (!indicator)
            return;
        if (hide) {
            indicator.hide();
            if (!ps.connectedKinds.has(kind)) {
                indicator.connectObject('notify::visible', () => indicator.hide(), ps);
                ps.connectedKinds.add(kind);
            }
        }
        else {
            if (ps.connectedKinds.has(kind)) {
                indicator.disconnectObject(ps);
                ps.connectedKinds.delete(kind);
            }
            indicator.show();
        }
    }
}
