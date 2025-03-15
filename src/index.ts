import * as React from "react";
import { reactive, Observer } from "bonsify";

export { observer } from "bonsify";

export function useReactive<T extends Record<string, any>>(
  state: T | (() => T)
) {
  const [reactiveState] = React.useState(() =>
    reactive(typeof state === "function" ? state() : state)
  );

  return reactiveState;
}

useReactive.readonly = reactive.readonly;

export function useReactiveLayoutEffect(cb: () => void | (() => void)) {
  React.useLayoutEffect(() => {
    let cleanup: (() => void) | void;
    let unsubscribe: () => void;

    const createObserver = () => {
      unsubscribe?.();
      cleanup?.();

      const observer = new Observer();
      const stopTracking = observer.track();
      cleanup = cb();
      stopTracking();

      unsubscribe = observer.subscribe(createObserver);
    };

    createObserver();

    return () => {
      unsubscribe();
      cleanup?.();
    };
  }, []);
}

export function useReactiveEffect(cb: () => void | (() => void)) {
  React.useEffect(() => {
    let cleanup: (() => void) | void;
    let unsubscribe: () => void;

    const createObserver = () => {
      unsubscribe?.();
      cleanup?.();

      const observer = new Observer();
      const stopTracking = observer.track();
      cleanup = cb();
      stopTracking();

      unsubscribe = observer.subscribe(createObserver);
    };

    createObserver();

    return () => {
      unsubscribe();
      cleanup?.();
    };
  }, []);
}

export function useReactiveMemo<T>(cb: () => T) {
  const [snapshot, setSnapshot] = React.useState(0);
  const { observer, result } = React.useMemo(() => {
    const observer = new Observer();
    const untrack = observer.track();
    try {
      return {
        result: cb(),
        observer,
      };
    } finally {
      untrack();
    }
  }, [snapshot]);

  React.useEffect(
    () =>
      observer.subscribe(() => {
        setSnapshot(observer.getSnapshot());
      }),
    [observer]
  );

  return result;
}
