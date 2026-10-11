import * as Config from 'resource:///org/gnome/shell/misc/config.js';

/**
 * The GNOME Shell version, as a `[major, minor]` array usable for version-gated code, e.g.
 *
 * ```ts
 * if (SHELL_VERSION > [50]) { ... }
 * if (SHELL_VERSION <= [50, 2]) { ... }
 * ```
 */
const SHELL_VERSION = Config.PACKAGE_VERSION.split(".").map(Number);
/**
 * Recursively walks the topActor's nested children until a child is found that satisfies `test`.
 * If no such child is found, returns `null`
 */
function findActorBy(topActor, test) {
    for (let child of topActor.get_children()) {
        if (test(child)) {
            return child;
        }
        else if (child.get_n_children()) {
            let result = findActorBy(child, test);
            if (result) {
                return result;
            }
        }
    }
    return null;
}
/**
 * Recursively walks the topActor's nested children, collecting all actors that satisfy `test`.
 *
 * Does not descend further into the children of matching actors.
 */
function findAllActorsBy(topActor, test) {
    const res = [];
    for (let child of topActor.get_children()) {
        if (test(child)) {
            res.push(child);
        }
        else if (child.get_n_children()) {
            res.push(...findAllActorsBy(child, test));
        }
    }
    return res;
}

export { SHELL_VERSION, findActorBy, findAllActorsBy };
