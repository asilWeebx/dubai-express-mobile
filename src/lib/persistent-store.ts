/**
 * A tiny localStorage-backed store read through `useSyncExternalStore`.
 *
 * Cart and customer state live outside React: they must survive reloads and be
 * readable during render without a hydration mismatch. The server snapshot is
 * always the empty initial value, so SSR markup matches the first client
 * render; the real value arrives on subscribe, one tick later.
 */
export interface StoreState<T> {
  value: T;
  /** False until localStorage has been read, so UI can hold off on "empty". */
  ready: boolean;
}

export interface PersistentStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => StoreState<T>;
  getServerSnapshot: () => StoreState<T>;
  set: (updater: (current: T) => T) => void;
}

export function createPersistentStore<T>(
  key: string,
  initial: T,
  /** Validates what was saved, which may come from an older build. */
  parse: (saved: unknown) => T = (saved) => saved as T,
): PersistentStore<T> {
  // Frozen so every server render returns the same reference.
  const serverState: StoreState<T> = Object.freeze({ value: initial, ready: false });

  let state: StoreState<T> = serverState;
  let hydrated = false;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());

  const hydrate = () => {
    if (hydrated) return;
    hydrated = true;
    let value = initial;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) value = parse(JSON.parse(saved));
    } catch {
      // Private mode or blocked storage — fall back to the initial value.
    }
    state = { value, ready: true };
    emit();
  };

  return {
    subscribe(listener) {
      hydrate();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    getServerSnapshot: () => serverState,
    set(updater) {
      const next = updater(state.value);
      if (next === state.value) return;
      state = { value: next, ready: true };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Persisting is a convenience; the in-memory value still works.
      }
      emit();
    },
  };
}
