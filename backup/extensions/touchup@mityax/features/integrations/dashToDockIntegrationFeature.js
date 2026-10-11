import ExtensionFeature from '../../core/extensionFeature.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import TouchUpExtension from '../../extension.js';
import { NavigationBarFeature } from '../navigationBar/navigationBarFeature.js';
import { Delay } from '../../utils/delay.js';
import { ExtensionState } from 'resource:///org/gnome/shell/misc/extensionUtils.js';
import GestureNavigationBar from '../navigationBar/widgets/gestureNavigationBar.js';
import St from 'gi://St';
import { settings } from '../../settings.js';
import { EdgeDragTransition } from '../../utils/ui/edgeDragTransition.js';
import { SmoothFollower, SmoothFollowerLane } from '../../utils/gestures/smoothFollower.js';

const SWIPE_UP_THRESHOLD = 40; // in logical pixels (this also scaled by the `dash-to-dock-integration-overview-threshold-factor` setting – default: 2)
const DOCK_HIDE_DELAY = 2 * 1000; // in milliseconds
const DASH_TO_DOCK_EXT_UUID = 'dash-to-dock@micxgx.gmail.com';
var DockState;
(function (DockState) {
    DockState[DockState["SHOWING"] = 1] = "SHOWING";
    DockState[DockState["SHOWN"] = 2] = "SHOWN";
})(DockState || (DockState = {}));
class DashToDockIntegrationFeature extends ExtensionFeature {
    _extModule;
    _integration;
    async initialize() {
        const ext = Main.extensionManager.lookup(DASH_TO_DOCK_EXT_UUID);
        await this._onExtensionStateChanged(ext);
        this.pm.connectTo(Main.extensionManager, 'extension-state-changed', (_, ext) => {
            if (ext.uuid === DASH_TO_DOCK_EXT_UUID) {
                this._onExtensionStateChanged(ext);
            }
            return undefined; // for ts only, type hints appear to require this (has no effect)
        });
        // Connect to NavigationBarFeature enabling/disabling, and to navigation bar changes (e.g. when changing mode)
        let navBarChangedConnectPatch;
        this.pm.connectTo(TouchUpExtension.instance, 'feature-enabled', (f) => {
            if (f instanceof NavigationBarFeature) {
                navBarChangedConnectPatch = this.pm.connectTo(f, 'navigation-bar-changed', () => this._syncEnabled());
                this._syncEnabled();
            }
        });
        this.pm.connectTo(TouchUpExtension.instance, 'feature-disabled', (name) => {
            if (name === 'navigation-bar') {
                this.pm.drop(navBarChangedConnectPatch); // feature has been destroyed; no need to disconnect anymore
                this._syncEnabled();
            }
        });
    }
    _syncEnabled() {
        const navBar = TouchUpExtension.instance.getFeature(NavigationBarFeature)?.currentNavBar;
        const dock = this._extModule?.dockManager.getDockByMonitor(navBar?.monitor.index ?? 0);
        this._integration?.destroy();
        if (navBar instanceof GestureNavigationBar && dock) {
            this._integration = new _DashToDockIntegration(this.pm.fork('integration'), navBar, dock);
            const connectPatch = this.pm.connectTo(dock, 'destroy', () => {
                this._syncEnabled();
                this.pm.drop(connectPatch);
            });
        }
        else {
            this._integration = undefined;
        }
    }
    async _onExtensionStateChanged(ext) {
        // @ts-ignore: ExtensionState.ACTIVE type hint is missing in girs
        if (ext?.state === ExtensionState.ACTIVE) {
            this._extModule ??= await import('file://' + ext.path + '/extension.js');
        }
        else {
            this._extModule = undefined;
        }
        this._syncEnabled();
    }
    destroy() {
        super.destroy();
        this._integration?.destroy();
    }
}
/**
 * This is the core integration with DashToDock – it glues together TouchUps gesture navigation bar with DashToDocks
 * dock, allowing to swipe up the dock before the navigation bar starts modulating overview progress.
 *
 * To keep things clean, the lifecycle of this class is tied to one specific dock instance and one specific
 * navigation bar instance; if any of them is re-created, a new instance of this class will replace the old one.
 */
class _DashToDockIntegration {
    pm;
    dock;
    _swipeUpThresholdPatch;
    _isDockInIntermediateState = false;
    _hideDelay;
    _transition;
    _smoothFollower;
    constructor(pm, navBar, dock) {
        this.pm = pm;
        this.dock = dock;
        this._swipeUpThresholdPatch = this.pm.patch(() => {
            navBar.gestureManager.setSwipeUpThreshold(this._swipeUpThreshold);
            return () => {
                navBar.gestureManager.setSwipeUpThreshold(0);
            };
        });
        this.pm.connectTo(navBar.gestureManager, 'gesture-started', (state) => this._onGestureStarted(state));
        this.pm.connectTo(navBar.gestureManager, 'gesture-progress', (state) => this._onGestureProgress(state));
        this.pm.connectTo(navBar.gestureManager, 'navigation-started', () => this._onNavigationStarted());
        this.pm.connectTo(navBar.gestureManager, 'gesture-ended', (state) => this._onGestureEnded(state));
        // React to dock visibility changes  (the docks `showing` and `hiding` signals are not always fired, thus we
        // listen to method calls):
        const self = this;
        this.pm.appendToMethod(Object.getPrototypeOf(this.dock), ['_animateIn', '_animateOut'], function () {
            if (this === self.dock) {
                // Enable swipe up threshold based on whether the dock is visible, and always during gesture:
                self._swipeUpThresholdPatch.setEnabled(!self._dockIsVisible || self._isDockInIntermediateState);
                // If the dock is animated in or out independently of our gesture, cancel the hide delay to hand over
                // control back to DashToDock:
                if (!self._isDockInIntermediateState && self._hideDelay) {
                    self._hideDelay.cancel();
                    self._hideDelay = undefined;
                }
            }
        });
        this._transition = new EdgeDragTransition({
            fullExtent: this._swipeUpThreshold,
            initialExtent: this._swipeUpThreshold / 2,
        });
        this._smoothFollower = new SmoothFollower([
            new SmoothFollowerLane({
                onUpdate: (motionDelta) => {
                    const val = this._transition.interpolate(motionDelta);
                    this.dock._slider.slideX = 1 + val.translation / this._transition.fullExtent;
                    this.dock.opacity = val.opacity;
                }
            })
        ]);
        // Adjust transition to dock height changes (use grand child size, since the dock is in a sliding container):
        this.pm.connectTo(this.dock.get_first_child().get_first_child(), 'notify::height', (child) => {
            this._transition.fullExtent = child.height;
            this._transition.initialExtent = child.height / 2;
        });
        // React to swipe dist threshold setting change:
        this.pm.connectTo(settings.integrations.dashToDock.gestureThresholdFactor, 'changed', () => {
            if (this._swipeUpThresholdPatch.isEnabled) {
                this._swipeUpThresholdPatch.enable(true); // force re-enabling to update value
            }
        });
    }
    get _dockIsVisible() {
        return [DockState.SHOWN, DockState.SHOWING].includes(this.dock.dockState);
    }
    get _swipeUpThreshold() {
        return SWIPE_UP_THRESHOLD
            * settings.integrations.dashToDock.gestureThresholdFactor.get()
            * St.ThemeContext.get_for_stage(global.stage).scaleFactor;
    }
    _onGestureStarted(state) {
        if (this._dockIsVisible)
            return;
        this._smoothFollower.start(lane => lane.currentValue = 0);
    }
    _onGestureProgress(state) {
        // If the dock is already fully shown, do nothing:
        if (this.dock.dockState === DockState.SHOWN)
            return;
        if (!this._dockIsVisible) {
            this._smoothFollower.update(lane => lane.target = -state.totalMotionDelta.y);
            this._isDockInIntermediateState = true;
        }
    }
    /**
     * Called when the navigation bar decides it's time to let the navigation gesture effect take over; this is our
     * signal to complete the dock transition.
     */
    _onNavigationStarted() {
        this._smoothFollower.stop();
        this._easeDockVisible();
    }
    _onGestureEnded(state) {
        this._smoothFollower.stop();
        if (this._isDockInIntermediateState) {
            this._isDockInIntermediateState = false;
            if (state.lastMotionDirection?.direction === 'up' || Main.overview.visible) {
                this.dock._show();
                this._easeDockVisible();
                this._scheduleDelayedDockHide();
            }
            else {
                this.dock._animateOut(0.1, 0);
                this._easeDockInvisible();
            }
        }
    }
    _easeDockVisible() {
        this.dock.ease({
            opacity: 255,
            duration: 100,
        });
    }
    _easeDockInvisible() {
        this.dock.ease({
            opacity: 0,
            duration: 100,
            onStopped: () => this.dock.opacity = 255,
        });
    }
    _scheduleDelayedDockHide() {
        this._hideDelay?.cancel();
        this._hideDelay = Delay.ms(DOCK_HIDE_DELAY).then(() => {
            if (!Main.overview.visible) {
                this.dock._hide();
            }
            this._hideDelay = undefined;
        });
    }
    destroy() {
        this.pm.destroy();
    }
}

export { DashToDockIntegrationFeature };
