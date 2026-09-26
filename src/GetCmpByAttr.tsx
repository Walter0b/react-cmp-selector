import {
  Children,
  Fragment,
  cloneElement,
  createElement,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

type ElementProps = Record<string, unknown>;
type SelectedElement = ReactElement<ElementProps>;
const markerKey = Symbol.for('react-cmp-selector.marker');
type MarkerMetadata = { attribute: string; name: string };

export interface ComponentFinderProps<P = ElementProps> {
  children: ReactNode;
  attribute?: string;
  value?: string;
  props?: Partial<P>;
  debug?: boolean;
  findAll?: boolean;
  functionPropMerge?: 'combine' | 'override';
}

function isProduction(): boolean {
  try {
    // Keep this expression intact so browser bundlers can replace it.
    return process.env.NODE_ENV === 'production';
  } catch {
    return false;
  }
}

function attributeValue(element: SelectedElement, attribute: string): unknown {
  const type = element.type;
  if (typeof type === 'function') {
    const marker = (type as unknown as Record<symbol, MarkerMetadata>)[
      markerKey
    ];
    if (marker?.attribute === attribute) return marker.name;
  }
  return element.props[attribute];
}

function visit(
  children: ReactNode,
  callback: (element: SelectedElement, path: string) => boolean,
  parentPath = '',
  scopedKeys = false,
): boolean {
  let stopped = false;
  const nodes = scopedKeys ? Children.toArray(children) : children;
  Children.forEach(nodes, (child, index) => {
    if (stopped || !isValidElement<ElementProps>(child)) return;
    const segment = child.key === null ? `i${index}` : `k${String(child.key)}`;
    // Length prefixes keep keys unambiguous across nested sibling groups.
    const path = scopedKeys ? `${parentPath}${segment.length}:${segment}` : '';
    stopped = callback(child, path);
    if (!stopped && child.props.children != null) {
      stopped = visit(
        child.props.children as ReactNode,
        callback,
        path,
        scopedKeys,
      );
    }
  });
  return stopped;
}

function mergeProps(
  original: ElementProps,
  injected: ElementProps,
  strategy: 'combine' | 'override',
): ElementProps {
  const merged: ElementProps = { ...injected };
  for (const key of Object.keys(injected)) {
    // React 17/18 reserve key and ref and expose warning getters on props.
    if (key === 'key' || key === 'ref') continue;
    const previous = original[key];
    const next = injected[key];
    if (
      key === 'className' &&
      typeof previous === 'string' &&
      typeof next === 'string'
    ) {
      merged[key] = [previous, next].filter(Boolean).join(' ');
    } else if (
      key === 'style' &&
      previous &&
      next &&
      typeof previous === 'object' &&
      typeof next === 'object'
    ) {
      merged[key] = { ...previous, ...next };
    } else if (
      strategy === 'combine' &&
      typeof previous === 'function' &&
      typeof next === 'function'
    ) {
      merged[key] = function (this: unknown, ...args: unknown[]) {
        previous.apply(this, args);
        return next.apply(this, args);
      };
    }
  }
  return merged;
}

export function getCmpByAttr<P = ElementProps>(
  options: ComponentFinderProps<P> & { findAll: true },
): SelectedElement[];
export function getCmpByAttr<P = ElementProps>(
  options: ComponentFinderProps<P> & { findAll?: false },
): SelectedElement | null;
export function getCmpByAttr<P = ElementProps>(
  options: ComponentFinderProps<P>,
): SelectedElement | SelectedElement[] | null;
export function getCmpByAttr<P = ElementProps>({
  children,
  attribute = 'data-slot',
  value = '',
  props,
  debug = false,
  findAll = false,
  functionPropMerge = 'combine',
}: ComponentFinderProps<P>): SelectedElement | SelectedElement[] | null {
  const matches: SelectedElement[] = [];
  const injected = props as ElementProps | undefined;
  const hasOverrides =
    injected !== undefined && Object.keys(injected).length > 0;
  visit(
    children,
    (element, path) => {
      if (attributeValue(element, attribute) !== value) return false;
      const overrides = hasOverrides
        ? mergeProps(element.props, injected!, functionPropMerge)
        : {};
      const selected = findAll
        ? cloneElement(element, { ...overrides, key: path })
        : hasOverrides
          ? cloneElement(element, overrides)
          : element;
      matches.push(selected);
      return !findAll;
    },
    '',
    findAll,
  );
  if (debug && !isProduction()) {
    console.debug(
      `[react-cmp-selector] ${attribute}="${value}": ${matches.length} match(es)`,
      matches,
    );
  }
  return findAll ? matches : (matches[0] ?? null);
}

export interface SlotProps<P = ElementProps> extends Omit<
  ComponentFinderProps<P>,
  'value'
> {
  name: string;
  fallback?: ReactNode;
}

export function Slot<P = ElementProps>({
  name,
  fallback = null,
  ...options
}: SlotProps<P>): ReactElement {
  const result = getCmpByAttr({ ...options, value: name });
  const content =
    result === null || (Array.isArray(result) && result.length === 0)
      ? fallback
      : result;
  return createElement(Fragment, null, content);
}

export type SlotMarkerProps = HTMLAttributes<HTMLDivElement> & {
  [attribute: `data-${string}`]: unknown;
};

function createMarker(name: string, attribute = 'data-slot') {
  function SlotMarker({
    children,
    style,
    ...props
  }: SlotMarkerProps): ReactElement {
    return createElement(
      'div',
      {
        ...props,
        style: { display: 'contents', ...style },
        [attribute]: name,
      },
      children,
    );
  }
  SlotMarker.displayName = `SlotMarker(${name})`;
  Object.defineProperty(SlotMarker, markerKey, { value: { name, attribute } });
  return SlotMarker;
}

function validate(
  children: ReactNode,
  requiredSlots: readonly string[],
  attribute = 'data-slot',
): string[] {
  const present = new Set<unknown>();
  visit(children, (element) => {
    present.add(attributeValue(element, attribute));
    return false;
  });
  const missing = [...new Set(requiredSlots)].filter(
    (name) => !present.has(name),
  );
  if (!isProduction()) {
    missing.forEach((name) => console.warn(`Missing required slot: "${name}"`));
  }
  return missing;
}

export const SlotUtils = { createMarker, validate };
