import { ExtensionFeatureManager } from './extensionFeatureManager.js';
import EventEmitter from '../utils/eventEmitter.js';

/**
 * Base class for each feature of this extension.
 */
class ExtensionFeature extends EventEmitter {
    pm;
    subFeatureManager;
    constructor(patchManager) {
        super();
        this.pm = patchManager;
        this.subFeatureManager = new ExtensionFeatureManager(this.pm.fork("fm"));
        // Notice: Using the [PatchManager] is not required here (subFeatureManager is destroyed), this is just to
        // make Shexli happy
        this.pm.connectTo(this.subFeatureManager, 'feature-enabled', (f) => this.emit('sub-feature-enabled', f));
        this.pm.connectTo(this.subFeatureManager, 'feature-disabled', (name) => this.emit('sub-feature-disabled', name));
    }
    /**
     * Subclasses can overwrite this to perform initialization requiring async code. This will be called
     * by the [FeatureManager] immediately after the constructor has been invoked, and will be awaited
     * by the enclosing context before continuing.
     */
    async initialize() { }
    /**
     * Adds a sub-feature to this extension feature and optionally binds (= automatically creates and destroys) it
     * to the given setting.
     *
     * If no setting is given, the sub-feature is created immediately and destroyed when this extension feature
     * is destroyed.
     */
    async defineSubFeature(meta) {
        await this.subFeatureManager.defineFeature(meta);
    }
    getSubFeature(type) {
        return this.subFeatureManager.getFeature(type);
    }
    /**
     * Called when the Shells session mode has changed, without the extension being disabled
     * and re-enabled.
     *
     * Important: When overriding this method, make sure to call the super classes method to
     * ensure that all subfeatures are properly notified too.
     */
    async notifySessionModeChanged() {
        await this.subFeatureManager.notifySessionModeChanged();
    }
    destroy() {
        this.pm.destroy();
        // Destroy all sub-features (this has been done already by the PatchManager, but is explicitly done
        // here again to not make things unnecessarily complicated for reviewers):
        this.subFeatureManager.destroy();
    }
}

export { ExtensionFeature as default };
