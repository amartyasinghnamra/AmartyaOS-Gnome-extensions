function clamp(value, min, max) {
    if (max < min) {
        [min, max] = [max, min];
    }
    return Math.min(Math.max(value, min), max);
}
function randomChoice(arr) {
    return arr[Math.floor(arr.length * Math.random())];
}
function filterObject(obj, fn) {
    return Object.fromEntries(
    //@ts-ignore
    Object.entries(obj).filter(fn));
}
function oneOf(v, filter, orElse) {
    if (filter.includes(v)) {
        return v;
    }
    return orElse;
}

export { clamp, filterObject, oneOf, randomChoice };
