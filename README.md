# use-reactive-react

Have you ever found yourself reflecting on the following:

- State Management in React does not scale
- Dependency arrays wreck my brain
- Expressing state updates has so much boilerplate
- Global state management makes everything so much simpler, but I would love to just use React

Often hooks are blamed for these frustrations, but the problem with React is not its hooks... well, not all of them... just the ones managing state.

But what if we could replace them with hooks that scales, has no dependency arrays, expresses state updates with normal JavaScript and does not require you to go global?

| react                               | use-reactive-react      |
| ----------------------------------- | ----------------------- |
| useState / useReducer / useCallback | useReactive             |
| useMemo                             | useReactiveMemo         |
| useEffect                           | useReactiveEffect       |
| useLayoutEffect                     | useReactiveLayoutEffect |

## useState VS useReactive

### Updating state

Updating state in **React** adds the mental overhead of value comparison. You can not use native mutation APIs in JavaScript, you are forced to lean on often complex boilerplate ensuring reference updates to objects and arrays are correct, or components will not reconcile.

```tsx
import { useState } from "react";

function Counter() {
  const [state, setState] = useState({ count: 0 });

  return (
    <button
      onClick={() => {
        setState((current) => ({
          ...state,
          count: current.count + 1,
        }));
      }}
    >
      Count is {state.count}
    </button>
  );
}
```

With **use-reactive-react** you can use JavaScript as you know it:

```tsx
import { useReactive } from "use-reactive-react";

function Counter() {
  const state = useReactive({
    count: 0,
  });

  return (
    <button
      onClick={() => {
        state.count++;
      }}
    >
      Count is {state.count}
    </button>
  );
}
```

### Updating state async

As components can unmount at any time, updating state asynchronously is a challenge in **React**. A component will error if the state is updated after it has unmounted. This example is considered unsafe:

```tsx
import { useState } from "react";

function Counter() {
  const [state, setState] = useState({ count: 0 });

  useEffect(() => {
    fetchInitialCount().then((initialCount) => {
      setState({
        ...state,
        count: initialCount,
      });
    });
  }, []);

  return (
    <button
      onClick={() => {
        setState((current) => ({
          ...state,
          count: current.count + 1,
        }));
      }}
    >
      Count is {state.count}
    </button>
  );
}
```

With **use-reactive-react** the component stops subscribing to state changes when it unmounts. That means any changes made after that does not cause reconciliation. This is considered safe:

```tsx
import { useReactive, useReactiveEffect } from "use-reactive-react";

function Counter() {
  const state = useReactive({
    count: 0,
  });

  useReactiveEffect(() => {
    fetchInitialCount().then((initialCount) => {
      state.count = initialCount;
    });
  });

  return (
    <button
      onClick={() => {
        state.count++;
      }}
    >
      Count is {state.count}
    </button>
  );
}
```

### Exposing state

You want to constrain how your state can change. For example the counter should only increase. With **React** you can orchestrate references for predictable reconciliation using hooks:

```tsx
function useCounter() {
  const [state, setState] = useState({
    count: 0,
  });

  const increment = useCallback(() => {
    setState((current) => ({
      ...current,
      count: current.count + 1,
    }));
  }, []);

  return useMemo(
    () => ({
      ...state,
      increment,
    }),
    [state, increment]
  );
}

function Counter() {
  const counter = useCounter();

  return <button onClick={counter.increase}>Count is {counter.count}</button>;
}
```

Or you can change the mental model of state and state updates, by using `useReducer`, though this limits you to purely updating state, not run other logic:

```tsx
function useCounter() {
  return useReducer((state, action) => {
    switch (action.type) {
      case "INCREMENT": {
        return {
          ...state,
          count: current.count + 1,
        };
      }
    }

    return state;
  });
}

function Counter() {
  const [counter, counterDispatch] = useCounter();

  return (
    <button onClick={() => counterDispatch({ type: "INCREMENT" })}>
      Count is {counter.count}
    </button>
  );
}
```

But with **use-reactive-react** you simply expose the state as readonly from the outside scope:

```tsx
import { useReactive, useReadonly } from "use-reactive-react";

function useCounter() {
  const state = useReactive({
    count: 0,
    increase() {
      store.count++;
    },
  });

  // Explicitly protect against any changes outside
  // the scope of this hook
  return useReadonly(state);
}

function Counter() {
  const counter = useCounter();

  return <button onClick={counter.increase}>Count is {counter.count}</button>;
}
```

### Passing state as props

When passing state as props in **React** you need to evaluate how often those props change VS the complexity of reconciliation in the nested component. Should you use `memo` or not?

```tsx
function useCounter() {
  const [state, setState] = useState({
    count: 0,
  });

  const increment = useCallback(() => {
    setState((current) => ({
      ...current,
      count: current.count + 1,
    }));
  }, []);

  return useMemo(
    () => ({
      ...state,
      increment,
    }),
    [state, increment]
  );
}

function Counter() {
  const counter = useCounter();

  return (
    <div>
      <h1>Count is {counter.count}</h1>
      <IncreaseCountA counter={counter} />
      <IncreaseCountB increase={counter.increase} />
    </div>
  );
}
```

The **IncreaseCountA** can not be optimized with `memo` because whenever the `count` changes, so does the `counter` object. But if we pass only the `counter.increase`, as shown in **IncreaseCountB**, that `increase` will not change reference when the `count` changes... given that we do not use the `count` as a dependency in `useCallback`.

With **use-reactive-react** you do not have to think about this at all:

```tsx
import { useReactive, useReadonly } from "use-reactive-react";

function useCounter() {
  const state = useReactive({
    count: 0,
    increase() {
      state.count++;
    },
  });

  return useReadonly(state);
}

function Counter() {
  const counter = useCounter();

  return (
    <div>
      <h1>Count is {counter.count}</h1>
      <IncreaseCountA counter={counter} />
      <IncreaseCountB increase={counter.increase} />
    </div>
  );
}
```

With **use-reactive-react** your components will predictably reconcile. You do not have to consider value comparison or `memo` components when sharing state with other components.

### Exposing state from context

When exposing state from context it is impossible to do any kind of optimizations at the consumption point of the context. In **React**, even when ensuring consistency of all references, the value exposed on the context will change regardless of how the state is updated. Additionally it does not matter what state the consumer of the context is actually using.

```tsx
const CounterContext = createContext<Counter>({});

const useCounter = () => useContext(CounterContext);

function CounterProvider({ children }) {
  const [state, setState] = useState({
    count: 0,
  });

  const increment = useCallback(() => {
    setState((current) => ({
      ...current,
      count: current.count + 1,
    }));
  }, []);

  const counter useMemo(
    () => ({
      ...state,
      increment,
    }),
    [state, increment]
  );

  return (
    <CounterContext.Provider value={counter}>
      {children}
    </CounterContext.Provider>
  );
}

function Counter() {
  const counter = useCounter();

  return (
    <div>
      <h1>Count is {counter.count}</h1>
      <IncreaseCount />
    </div>
  );
}

function IncreaseCount() {
  const counter = useCounter();

  return (
    <div>
      <button onClick={counter.increase}>Increase</button>
    </div>
  );
}
```

Now `IncreaseCount` will always reconcile, even though it only consumes `counter.increase`, and there is nothing you can do about it.

With **use-reactive-react** this is not a concern:

```tsx
import { useReactive, useReadonly } from "use-reactive-react";

const CounterContext = createContext<Counter>({});

const useCounter = () => useContext(CounterContext);

function CounterProvider({ children }) {
  const state = useStore({
    count: 0,
    increase() {
      state.count++;
    },
  });

  return (
    <CounterContext.Provider value={useReadonlyStore(state)}>
      {children}
    </CounterContext.Provider>
  );
}

function Counter() {
  const counter = useCounter();

  return (
    <div>
      <h1>Count is {counter.count}</h1>
      <IncreaseCount />
    </div>
  );
}

function IncreaseCount() {
  const counter = useCounter();

  return (
    <div>
      <button onClick={counter.increase}>Increase</button>
    </div>
  );
}
```

Now `IncreaseCount` will never reconcile, only `Counter`, cause `Counter` is the only one that consumes the `count`.

## useMemo VS useReactiveMemo

In **React** `useMemo` is used to memoize the result of computing a value. This requires you to manage a dependency array to evaluate when the value should be recomputed.

```tsx
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
```

With **use-reactive-react** you just consume state:

```tsx
const memoizedValue = useReactiveMemo(() => computeExpensiveValue(state));
```

It will recompute whenever whatever it accesss from the state changes.

## useEffect VS useReactiveEffect

In **React** `useEffect` is used to run a side effect after a render. This requires you to manage a dependency array to evaluate when the effect should run.

```tsx
useEffect(() => {
  doSomething(a, b);
}, [a, b]);
```

With **use-reactive-react** you again just consume state and it will run whenever whatever it accesss from the state changes:

```tsx
useReactiveEffect(() => {
  doSomething(state);
});
```

## useLayoutEffect VS useReactiveLayoutEffect

The same as above, only run right after DOM updates are applied.
