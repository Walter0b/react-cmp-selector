# react-cmp-selector

Named slots and attribute-based selection for React element trees.

Build layouts whose children declare where they belong. Select one or every matching element, inject props, or render a fallback. Written in TypeScript, with no runtime dependencies beyond React.

Supports React 17, 18 and 19. Ships ESM, CommonJS and TypeScript declarations.

## Installation

```sh
npm install react-cmp-selector
```

React is a peer dependency. Use your application's existing React installation.

## Quick start

```tsx
import type { ReactNode } from 'react';
import { Slot } from 'react-cmp-selector';

function Layout({ children }: { children: ReactNode }) {
  return (
    <article>
      <header>
        <Slot name="header" fallback={<h1>Untitled</h1>}>
          {children}
        </Slot>
      </header>
      <main>
        <Slot name="body">{children}</Slot>
      </main>
    </article>
  );
}

export default function Page() {
  return (
    <Layout>
      <h1 data-slot="header">My project</h1>
      <p data-slot="body">Welcome!</p>
    </Layout>
  );
}
```

`Slot` adds no DOM wrapper. Unmatched content is omitted unless you render it separately.

## What can be searched?

The selector inspects **the elements you pass in**, including arrays, fragments, and nested `props.children`. It never calls your components to discover their output.

```tsx
// Works: the header element is part of the supplied tree.
<Slot name="header">
  <>
    <h1 data-slot="header">Hello</h1>
  </>
</Slot>;

// Does not find a header returned inside PageContent.
<Slot name="header">
  <PageContent />
</Slot>;

// Works: select PageContent itself by a prop on its element.
<Slot name="header">
  <PageContent data-slot="header" />
</Slot>;
```

Custom components do not need to forward the attribute to the DOM for selection to work. They do need to accept any injected props you want them to use.

This boundary is part of [React's children model](https://react.dev/reference/react/Children#troubleshooting). Context, memoization and Next.js layouts do not make a component's rendered output inspectable. Portals and unresolved async children are not searchable. Pass a synchronous element tree; await data before constructing it.

Selecting a nested element moves that element into the slot without its ancestors. Ancestor styles, context providers and DOM structure do not follow it. If an ancestor and its descendant both match `findAll`, both are returned, which can render the descendant twice.

For a small fixed layout, explicit props such as `header={<Header />}` may be simpler. This library is useful when callers supply a collection of children and the layout selects them by role.

## Select elements programmatically

`getCmpByAttr` is a regular function, **not a hook**. You can use it in a component, during server rendering, or outside React.

```tsx
import { getCmpByAttr } from 'react-cmp-selector';

const children = (
  <>
    <button data-role="action">Save</button>
    <button data-role="action">Cancel</button>
  </>
);

const buttons = getCmpByAttr({
  children,
  attribute: 'data-role',
  value: 'action',
  findAll: true,
  props: { className: 'tracked' },
});
// ReactElement[]; [] if nothing matches.
```

The default selects the first match in depth-first order and returns `null` when none exists. With `findAll: true`, the result is always an array. TypeScript overloads reflect these return types.

A single match with no injected props retains its original element identity. Multiple matches receive keys scoped to their original tree paths so local keys from separate branches do not collide. Supply stable React keys to preserve identity when siblings reorder; moving an element between branches changes its generated key.

## Prop merging

```tsx
const action = getCmpByAttr({
  children: (
    <button data-slot="action" onClick={() => console.log('child')}>
      Save
    </button>
  ),
  value: 'action',
  props: { onClick: () => console.log('parent') },
});
```

- Ordinary injected props replace existing values.
- `className` strings are joined with a space. Class conflicts are not resolved.
- `style` objects are shallowly merged, with injected properties winning.
- Functions run child-first, then injected, with the same arguments and `this`. The combined function returns the injected function's result. Set `functionPropMerge: 'override'` to replace functions instead.
- `ref` follows React's replacement rules: a non-undefined injected ref replaces the original, `null` clears it, and `undefined` preserves it. Ref callbacks are never combined. Existing refs and single-match keys are otherwise preserved. `findAll` owns result keys and ignores an injected `key`.
- Explicit `undefined` can clear a class or style value. Omitted props stay unchanged.

Function combination is synchronous: it does not await promises or skip the second callback after `event.preventDefault()`. If the first callback throws, the second does not run. Use `override` and your own handler when you need different behavior.

For typed injected props, pass a generic:

```tsx
import type { ButtonHTMLAttributes } from 'react';

getCmpByAttr<ButtonHTMLAttributes<HTMLButtonElement>>({
  children,
  attribute: 'data-role',
  value: 'action',
  props: { disabled: true },
});
```

The generic checks injected props; it cannot prove that every element selected from an arbitrary tree accepts them.

## Reusable slot markers

Markers let you name a slot once. Declare them **outside render functions** so their component identity stays stable.

```tsx
import { Slot, SlotUtils } from 'react-cmp-selector';

const HeroSlot = SlotUtils.createMarker('hero');

export default function Page() {
  return (
    <Slot name="hero" fallback={<p>No hero yet</p>}>
      <HeroSlot className="hero">
        <h1>Hello</h1>
      </HeroSlot>
    </Slot>
  );
}
```

Markers are discoverable from metadata on their component type before React renders them. They render a `<div data-slot="hero" style="display: contents">` and accept normal div attributes. You may override the display style. The marker name is fixed; supplying another `data-slot` does not rename it.

`createMarker(name, attribute)` also supports custom attributes. Use the same attribute when selecting or validating. Pass marker elements directly or within explicit children; hiding them inside another component's implementation still prevents discovery. Wrapping a marker type in `memo` or a higher-order component hides its metadata; put the selection attribute on the wrapper element instead.

## Fallbacks and multiple matches

```tsx
<Slot name="action" findAll fallback={<p>No actions</p>}>
  {children}
</Slot>
```

`Slot` accepts the selector options, with `name` instead of `value`, plus `fallback`. It renders the fallback only when there are no matches, including an empty `findAll` result. The default fallback is `null`.

## Validate layout contracts

```tsx
const missing = SlotUtils.validate(children, ['header', 'body']);
// string[] of missing names, in requested order, without duplicates.
```

Validation uses the same traversal and marker support as selection. It returns missing names in every environment and also warns outside production. A third argument selects a custom attribute. Run validation where diagnostics are useful; calling it during render may log repeatedly.

## API reference

| Selector option     | Default       | Meaning                                 |
| ------------------- | ------------- | --------------------------------------- |
| `children`          | Required      | React elements to inspect               |
| `attribute`         | `'data-slot'` | Prop name to match                      |
| `value`             | `''`          | Exact string value to match             |
| `props`             | None          | Props to inject into selected elements  |
| `findAll`           | `false`       | Return all matches instead of the first |
| `functionPropMerge` | `'combine'`   | Combine or override function props      |
| `debug`             | `false`       | Log results outside production          |

Exports: `getCmpByAttr`, `Slot`, `SlotUtils`, and the types `ComponentFinderProps`, `SlotProps`, `SlotMarkerProps`.

The library uses no hooks, browser APIs, React internals or component execution. It can select supplied element trees during server rendering. Framework server/client boundaries still apply: it cannot inspect client component output from a server component, and event handlers remain subject to your framework's rules.

## Migrating from v2

Version 3 is a major release with these intentional changes:

1. `getCmpByAttr` no longer calls hooks. Existing calls inside components continue to work; calls outside components now work too. If you need memoization for a large stable tree, wrap the call in your own `useMemo`.
2. `onFound` was removed. It previously ran side effects during render. Use the returned elements directly, or put client-side notifications in your own `useEffect` with appropriate dependencies. Effects may run again under Strict Mode; this was never an exactly-once callback.
3. `findAll: true` returns `[]` instead of `null` when nothing matches. Check `.length`; an empty array is truthy.
4. Classes and styles now merge. To remove existing values, explicitly inject `undefined`. Function combination returns the injected result and never combines refs.
5. Markers are now discoverable and validation recurses through the same supplied tree. Validation returns missing names, including in production; warnings remain disabled in production.
6. React 19 is supported. `react-dom` is no longer a peer dependency. The package provides separate ESM and CommonJS files and targets ES2020; older browsers need application-level transpilation.
7. README examples now pass visible elements. Examples that expected selection inside `<ChildComponents />` never worked; expose the selection attribute on that component or pass its slotted elements explicitly.

## License

[MIT](./LICENSE)
