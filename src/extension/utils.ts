/**
 * @param f callback
 * @param wait milliseconds
 * @param abortValue if has abortValue, promise will reject it if
 * @returns debounced: Promise, force: () => void
 */
export function debouncePromise<T extends (...args: any[]) => any>(
    fn: T,
    wait: number,
    abortValue: any = undefined
): {
    debounced: (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
    force: () => void;
} {
    let cancel = () => {
        // do nothing
    };
    const force = {
        force: () => {
            // do nothing
        },
    };
    // type Awaited<T> = T extends PromiseLike<infer U> ? U : T
    type ReturnT = Awaited<ReturnType<T>>;
    const wrapFunc = (...args: Parameters<T>): Promise<ReturnT> => {
        cancel();
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve(fn(...args)), wait);
            cancel = () => {
                clearTimeout(timer);
                if (abortValue !== undefined) {
                    reject(abortValue);
                }
            };
            force.force = () => {
                clearTimeout(timer);
                resolve(fn(...args));
            };
        });
    };

    return { debounced: wrapFunc, force: () => force.force() };
}

export function debounceAsyncGenerator<TParams, T>(
    fn: (...args: TParams[]) => AsyncGenerator<T, void, void>,
    wait: number,
    abortValue: any = undefined
): {
    debounced: (...args: TParams[]) => AsyncGenerator<T, void, void>;
    force: () => void;
} {
    const force = {
        force: () => {
            // do nothing
        },
    };
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function* wrapFunc(...args: TParams[]): AsyncGenerator<T, void, void> {
        timer && clearTimeout(timer);
        let own_timer: ReturnType<typeof setTimeout> | null = null;

        try {
            await new Promise<void>((resolve) => {
                own_timer = timer = setTimeout(() => resolve(), wait);
                force.force = () => {
                    timer && clearTimeout(timer);
                    resolve();
                };
            });
        } catch (e) {
            if (abortValue !== undefined) {
                throw abortValue;
            }
        }

        for await (const item of fn(...args)) {
            if (own_timer !== timer) {
                break;
            }
            yield item;
        }
    }
    return { debounced: wrapFunc, force: () => force.force() };
}