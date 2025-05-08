function isObject(item: any): boolean {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
}

export function deepMerge<T extends object>(target: T, ...sources: Array<Partial<T>>): T {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const sourceValue = source[key];
                if (isObject(sourceValue) && isObject(target[key])) {
                    target[key] = deepMerge(target[key] as any, sourceValue as any);
                } else {
                    (target as any)[key] = sourceValue;
                }
            }
        }
    }
    return deepMerge(target, ...sources);
}