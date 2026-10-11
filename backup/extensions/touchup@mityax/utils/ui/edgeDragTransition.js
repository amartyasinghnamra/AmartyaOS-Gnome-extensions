import { clamp } from '../utils.js';

var OvershootMode;
(function (OvershootMode) {
    OvershootMode[OvershootMode["translation"] = 0] = "translation";
    OvershootMode[OvershootMode["scale"] = 1] = "scale";
    OvershootMode[OvershootMode["none"] = 2] = "none";
})(OvershootMode || (OvershootMode = {}));
class EdgeDragTransition {
    fullExtent;
    initialExtent;
    overshootMode;
    constructor(props) {
        this.fullExtent = props.fullExtent;
        this.initialExtent = props.initialExtent ?? props.fullExtent * 0.55;
        this.overshootMode = props.overshootMode ?? OvershootMode.scale;
    }
    interpolate(extent) {
        const initialProg = this.initialExtent / this.fullExtent;
        const unboundedProg = (extent / this.fullExtent) + initialProg;
        const prog = clamp(unboundedProg, 0, 1);
        const ease = EdgeDragTransition.easeInOut(prog);
        let scale = ease * 0.3 + 0.7;
        let translation = -this.fullExtent * (1 - ease);
        const activeRange = 1 - initialProg;
        const opacity = activeRange > 0
            ? clamp((prog - initialProg) / activeRange, 0, 1)
            : 1;
        const excess = Math.max(unboundedProg - 1, 0) * this.fullExtent;
        const overshoot = EdgeDragTransition.rubberBand(excess, this.fullExtent);
        if (this.overshootMode === OvershootMode.translation) {
            translation += overshoot;
        }
        else if (this.overshootMode === OvershootMode.scale) {
            scale += (overshoot / this.fullExtent) * 0.08;
        }
        return {
            translation,
            opacity: opacity * 255,
            scale,
        };
    }
    static rubberBand(displacement, dim, coefficient = 0.55) {
        if (displacement <= 0 || dim <= 0)
            return 0;
        return (1 - 1 / (displacement * coefficient / dim + 1)) * dim;
    }
    static easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    interpolateRelative(progress) {
        return this.interpolate(progress * this.fullExtent);
    }
    get initialValues() {
        return this.interpolateRelative(0);
    }
    get finalValues() {
        return this.interpolateRelative(1);
    }
}

export { EdgeDragTransition, OvershootMode };
