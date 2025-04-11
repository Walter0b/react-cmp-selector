# react-cmp-selector

A powerful and extensible utility for selecting and manipulating React components based on attributes. Ideal for dynamic layouts, slotted rendering, and component injection patterns.

---

## Table of Contents

- [react-cmp-selector](#react-cmp-selector)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Motivation](#motivation)
  - [Table of Proposals](#table-of-proposals)
  - [Usage](#usage)
    - [1. Basic Slot Matching](#1-basic-slot-matching)
    - [2. Matching Multiple Components](#2-matching-multiple-components)
    - [3. Combining Event Handlers](#3-combining-event-handlers)
    - [4. Declarative API with `<Slot>`](#4-declarative-api-with-slot)
    - [5. Fallback Slot Content](#5-fallback-slot-content)
    - [6. Slot Markers](#6-slot-markers)
    - [7. Slot Validation](#7-slot-validation)
  - [Use Cases](#use-cases)
  - [API Reference](#api-reference)
    - [`getCmpByAttr<P>()`](#getcmpbyattrp)
    - [`ComponentFinderProps`](#componentfinderprops)
    - [`Slot`](#slot)
    - [`SlotUtils`](#slotutils)
  - [Caveats](#caveats)
  - [License](#license)

---

## Installation

```bash
npm install react-cmp-selector
```

or using yarn:

```bash
yarn add react-cmp-selector
```

---

## Motivation

React does not support named slots or dynamic selection of children out of the box. This utility solves that by providing:

- A **hook** to search through children by attribute
- A **component-based API** (`<Slot>`) for declarative slot usage
- Tools to **inject props**, **merge handlers**, and **validate layout contracts**

---

## Table of Proposals

| Feature                       | Prop / Option              | Type                              | Description                                                   |
| ----------------------------- | -------------------------- | --------------------------------- | ------------------------------------------------------------- |
| **Attribute Matching**        | `attribute`                | `string`                          | Attribute name to search for (default: `'data-slot'`)         |
| **Value Matching**            | `value` / `name`           | `string`                          | The value to match against the selected attribute             |
| **Prop Merging**              | `props`                    | `Partial<P>`                      | Injected props to merge into the matched component(s)         |
| **Function Merging Strategy** | `functionPropMerge`        | `'combine' \| 'override'`         | Defines how function props like `onClick` should be merged    |
| **Debug Mode**                | `debug`                    | `boolean`                         | Enables logging of matching and merging behavior              |
| **Match All**                 | `findAll`                  | `boolean`                         | If true, returns all matching components instead of the first |
| **Hook Interface**            | `getCmpByAttr()`           | —                                 | Programmatic interface to extract and modify children         |
| **Declarative API**           | `<Slot>`                   | —                                 | React component alternative to the hook                       |
| **Slot Markers**              | `SlotUtils.createMarker()` | —                                 | Creates a named slot wrapper component                        |
| **Slot Validation**           | `SlotUtils.validate()`     | —                                 | Dev-only validation for required slot presence                |
| **Fallback Rendering**        | `fallback`                 | `ReactNode`                       | Rendered if no matching slot is found                         |
| **onFound Callback**          | `onFound`                  | `(element: ReactElement) => void` | Runs when a match is found (e.g. for side effects)            |

---

## Usage

### 1. Basic Slot Matching

**Children**

```tsx
export function ChildComponents() {
  return (
    <>
      <div data-slot="header">Header</div>
      <div data-slot="body">Body</div>
      <div data-slot="footer">Footer</div>
    </>
  );
}
```

**Parent**

```tsx
const header = getCmpByAttr({
  children: <ChildComponents />,
  value: "header",
  props: { className: "highlighted" },
});
```

**Output**

```html
<div data-slot="header" class="highlighted">Header</div>
```

**How It Works**

- `getCmpByAttr()` searches children for `data-slot="header"`.
- The match is cloned with the `className` prop added.

---

### 2. Matching Multiple Components

**Children**

```tsx
function Buttons() {
  return (
    <>
      <button data-role="action-button">Save</button>
      <button data-role="action-button">Cancel</button>
    </>
  );
}
```

**Parent**

```tsx
const buttons = getCmpByAttr({
  children: <Buttons />,
  attribute: "data-role",
  value: "action-button",
  findAll: true,
  props: { "data-tracked": true },
});
```

**Output**

```html
<button data-role="action-button" data-tracked="true">Save</button>
<button data-role="action-button" data-tracked="true">Cancel</button>
```

---

### 3. Combining Event Handlers

**Children**

```tsx
function CTA() {
  return (
    <button data-slot="cta" onClick={() => console.log("child")}>
      Click Me
    </button>
  );
}
```

**Parent**

```tsx
const cta = getCmpByAttr({
  children: <CTA />,
  value: "cta",
  props: {
    onClick: () => console.log("parent"),
  },
  functionPropMerge: "combine",
});
```

**Behavior**

Console logs:

```
child
parent
```

---

### 4. Declarative API with `<Slot>`

```tsx
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Slot name="header">{children}</Slot>
      <main>
        <Slot name="content">{children}</Slot>
      </main>
    </div>
  );
}
```

```tsx
function PageContent() {
  return (
    <>
      <div data-slot="header">Welcome</div>
      <div data-slot="content">Hello, world!</div>
    </>
  );
}

<Layout>
  <PageContent />
</Layout>;
```

**Output**

```html
<div>
  <div data-slot="header">Welcome</div>
  <main>
    <div data-slot="content">Hello, world!</div>
  </main>
</div>
```

---

### 5. Fallback Slot Content

```tsx
<Slot name="hero" fallback={<div>Default Hero</div>}>
  {children}
</Slot>
```

If no `data-slot="hero"` is found, it renders:

```html
<div>Default Hero</div>
```

---

### 6. Slot Markers

**Marker Declaration**

```tsx
const HeroSlot = SlotUtils.createMarker("hero");

function Page() {
  return (
    <HeroSlot>
      <div className="hero-banner">Custom Hero</div>
    </HeroSlot>
  );
}
```

**Parent**

```tsx
<Slot name="hero" fallback={<div>Default Hero</div>}>
  <Page />
</Slot>
```

---

### 7. Slot Validation

```tsx
SlotUtils.validate(children, ["header", "footer"]);
```

- Dev-only.
- Warns if `data-slot="header"` or `footer` is missing in children.

---

## Use Cases

- **Composable Layouts**: Dynamically slot content into shared layouts.
- **Design Systems**: Enable flexible API layers with predictable slot names.
- **Multi-brand / White-label UIs**: Inject branding-specific content without hardcoding.
- **Next.js Layouts**: Use context + slots to bridge `app/layout.tsx` and pages.
- **Dynamic Prop Injection**: Apply analytics, A/B testing, or class injection to specific slots.

---

## API Reference

### `getCmpByAttr<P>()`

```ts
function getCmpByAttr<P>(
  options: ComponentFinderProps<P>
): ReactNode | ReactNode[] | null;
```

### `ComponentFinderProps`

```ts
interface ComponentFinderProps<P = unknown> {
  children: ReactNode;
  attribute?: string;
  value?: string;
  props?: Partial<P>;
  debug?: boolean;
  findAll?: boolean;
  onFound?: (component: ReactElement) => void;
  functionPropMerge?: "combine" | "override";
}
```

### `Slot`

```tsx
<Slot
  name="footer"
  props={{ className: "sticky" }}
  fallback={<DefaultFooter />}
>
  {children}
</Slot>
```

### `SlotUtils`

```ts
SlotUtils.createMarker(name: string, attribute?: string): Component
SlotUtils.validate(children: ReactNode, requiredSlots: string[], attribute?: string): void
```

---

## Caveats

- **Next.js layouts** require a shared context if crossing page boundaries.
- `getCmpByAttr` only works on elements rendered within the same render cycle.
- This is **not a DOM query tool** – it’s entirely based on **React element trees**.

---

## License

MIT License
