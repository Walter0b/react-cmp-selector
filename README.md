
# react-cmp-selector

`react-cmp-selector` is a lightweight utility for filtering and selecting React components based on specific attributes and values. It allows developers to dynamically query and manipulate components within a React component tree, enabling more flexible and dynamic rendering logic.

## Features

- **Attribute-Based Component Selection:** Easily select and manipulate components by specifying a specific attribute and value.
- **Supports Additional Props:** Clone and extend components with additional props when rendering.
- **Debugging:** Optional debugging to log matched components during development.

## Installation

To install the package, run:

```bash
npm install react-cmp-selector
```

or using yarn:

```bash
yarn add react-cmp-selector
```

## Usage

### Basic Usage

Suppose you have a set of child components within a parent component, and you want to select a specific child component based on a `data-slot` attribute. You can use `react-cmp-selector` to do this.

#### Example

```typescript
import React from 'react';
import getCmpByAttr  from 'react-cmp-selector';

function ParentComponent({ children }: { children: React.ReactNode }) {
    const headerComponent = getCmpByAttr({
        children,
        value: 'header',  // Select component with data-slot="header"
    });

    const bodyComponent = getCmpByAttr({
        children,
        value: 'body',  // Select component with data-slot="body"
    });

    return (
        <div>
            {headerComponent}
            {bodyComponent}
        </div>
    );
}

export default function App() {
    return (
        <ParentComponent>
            <div data-slot="header">This is the header</div>
            <div data-slot="body">This is the body</div>
            <div data-slot="footer">This is the footer</div>
        </ParentComponent>
    );
}
```

### Use Cases

1. **Dynamic Rendering:**
   - Selectively render components based on specific criteria, such as user roles, permissions, or other dynamic conditions.

2. **Custom Layouts:**
   - Create custom layouts where different components are placed in specific slots. Use `react-cmp-selector` to retrieve and place these components in the correct positions.

3. **Component Wrapping:**
   - Wrap selected components with additional functionality or styling by cloning them with extra props.

### Advanced Usage

#### Passing Additional Props

You can pass additional props to the selected component using the `props` option:

```typescript
const enhancedHeader = getCmpByAttr({
    children,
    value: 'header',
    props: { className: 'enhanced-header' },  // Add additional props
});
```

#### Debugging

Enable debugging to log the selected component to the console:

```typescript
const headerWithDebug = getCmpByAttr({
    children,
    value: 'header',
    debug: true,  // Enable debugging
});
```

**Parameters:**

- `children`: `ReactNode` - The children components to search through.
- `attr`: `string` (optional) - The attribute to search by. Defaults to `data-slot`.
- `value`: `string` - The value of the attribute to match.
- `props`: `Record<string, any>` (optional) - Additional props to pass to the matched component.
- `debug`: `boolean` (optional) - If true, logs the matched component(s) to the console.

**Returns:**

- `ReactNode | null` - The matched component or `null` if no match is found.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have suggestions or improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](https://opensource.org/licenses/MIT) file for details.
