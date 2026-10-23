export function isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
}

function mergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = target[key];
            if (isObject(sourceValue) && isObject(targetValue)) {
                mergeInto(targetValue, sourceValue);
            } else {
                target[key] = sourceValue;
            }
        }
    }
}

export function deepMerge<T extends object>(target: T, ...sources: Array<Partial<T>>): T {
    for (const source of sources) {
        if (isObject(target) && isObject(source)) {
            mergeInto(target, source);
        }
    }
    return target;
}
