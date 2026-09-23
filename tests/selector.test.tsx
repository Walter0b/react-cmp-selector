import React, {
  Fragment,
  createElement,
  createRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  getCmpByAttr,
  Slot,
  SlotUtils,
  type ComponentFinderProps,
} from '../src';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('selection', () => {
  it('works outside a React render and preserves unchanged element identity', () => {
    const header = <h1 data-slot="header">Hello</h1>;
    expect(getCmpByAttr({ children: header, value: 'header' })).toBe(header);
    expect(getCmpByAttr({ children: header, value: 'header', props: {} })).toBe(
      header,
    );
  });

  it('searches arrays, fragments and explicit nested children in depth-first order', () => {
    const tree = (
      <>
        <section>
          <h1 data-slot="header">First</h1>
        </section>
        <h2 data-slot="header">Second</h2>
      </>
    );
    const result = getCmpByAttr({
      children: [null, false, 'text', 0, tree],
      value: 'header',
      findAll: true,
    });
    expect(result.map((element) => element.props.children)).toEqual([
      'First',
      'Second',
    ]);
    expect(getCmpByAttr({ children: tree, value: 'header' })?.type).toBe('h1');
  });

  it('matches custom attributes and empty values exactly', () => {
    const tree = (
      <>
        <div data-role="" />
        <div data-role="action" />
        <div />
      </>
    );
    expect(
      getCmpByAttr({ children: tree, attribute: 'data-role' })?.props[
        'data-role'
      ],
    ).toBe('');
    expect(
      getCmpByAttr({ children: tree, attribute: 'data-role', value: 'action' })
        ?.props['data-role'],
    ).toBe('action');
    expect(getCmpByAttr({ children: tree, value: 'missing' })).toBeNull();
  });

  it.each([null, undefined, false, 0, 'text', []])(
    'returns predictable empty results for %j',
    (children) => {
      expect(getCmpByAttr({ children })).toBeNull();
      expect(getCmpByAttr({ children, findAll: true })).toEqual([]);
    },
  );

  it('does not execute components to discover their rendered output', () => {
    const render = vi.fn();
    function Hidden() {
      render();
      return <h1 data-slot="header" />;
    }
    expect(getCmpByAttr({ children: <Hidden />, value: 'header' })).toBeNull();
    expect(render).not.toHaveBeenCalled();
  });

  it('can match a custom component itself or its explicitly supplied children', () => {
    function Wrapper({ children }: { children?: ReactNode }) {
      return <section>{children}</section>;
    }
    const child = <b data-slot="body" />;
    const wrapper = <Wrapper data-slot="wrapper">{child}</Wrapper>;
    expect(getCmpByAttr({ children: wrapper, value: 'wrapper' })).toBe(wrapper);
    expect(getCmpByAttr({ children: wrapper, value: 'body' })).toBe(child);
  });

  it('stops inspecting elements after the first match', () => {
    const tree = (
      <>
        <div data-slot="header" />
        <section>{{ invalid: true } as unknown as ReactNode}</section>
      </>
    );
    expect(getCmpByAttr({ children: tree, value: 'header' })?.type).toBe('div');
  });

  it('includes matching descendants of a matching parent when finding all', () => {
    const result = getCmpByAttr({
      children: (
        <div data-slot="x">
          <span data-slot="x" />
        </div>
      ),
      value: 'x',
      findAll: true,
    });
    expect(result.map((element) => element.type)).toEqual(['div', 'span']);
  });

  it('scopes duplicate local keys across branches and nested arrays', () => {
    const tree = [
      <Fragment key="a">
        <b key="same" data-slot="x" />
      </Fragment>,
      <Fragment key="b">
        <b key="same" data-slot="x" />
      </Fragment>,
      [<b key="same" data-slot="x" />],
      [<b key="same" data-slot="x" />],
    ];
    const result = getCmpByAttr({ children: tree, value: 'x', findAll: true });
    expect(new Set(result.map((element) => element.key)).size).toBe(4);
    expect(
      getCmpByAttr({ children: tree, value: 'x', findAll: true }).map(
        (element) => element.key,
      ),
    ).toEqual(result.map((element) => element.key));
  });

  it('keeps keyed matches stable when their branches reorder', () => {
    const a = (
      <section key="a">
        <b data-slot="x">A</b>
      </section>
    );
    const b = (
      <section key="b">
        <b data-slot="x">B</b>
      </section>
    );
    const select = (children: ReactNode) =>
      getCmpByAttr({ children, value: 'x', findAll: true });
    expect(select([a, b]).map((element) => element.key)).toEqual(
      select([b, a])
        .map((element) => element.key)
        .reverse(),
    );
  });

  it('provides useful return types for literal and dynamic findAll', () => {
    expectTypeOf(getCmpByAttr({ children: null, findAll: true })).toMatchTypeOf<
      ReactElement[]
    >();
    expectTypeOf(
      getCmpByAttr({ children: null }),
    ).toMatchTypeOf<ReactElement | null>();
    const options: ComponentFinderProps = {
      children: null,
      findAll: Math.random() > 0.5,
    };
    expectTypeOf(getCmpByAttr(options)).toMatchTypeOf<
      ReactElement | ReactElement[] | null
    >();
    getCmpByAttr<{ disabled: boolean }>({
      children: null,
      props: { disabled: true },
    });
    getCmpByAttr<{ disabled: boolean }>({
      children: null,
      // @ts-expect-error injected props respect an explicit type
      props: { disabled: 'yes' },
    });
    // @ts-expect-error render-phase callback was removed in v3
    getCmpByAttr({ children: null, onFound: () => {} });
  });
});

describe('prop merging', () => {
  it('merges classes and styles without mutating the original', () => {
    const child = (
      <button
        data-slot="action"
        className="base"
        style={{ color: 'red', padding: 4 }}
        title="old"
      />
    );
    const result = getCmpByAttr({
      children: child,
      value: 'action',
      props: { className: 'active', style: { color: 'blue' }, title: 'new' },
    });
    expect(result?.props).toMatchObject({
      className: 'base active',
      style: { color: 'blue', padding: 4 },
      title: 'new',
    });
    expect(child.props.className).toBe('base');
    expect(child.props.style).toEqual({ color: 'red', padding: 4 });
  });

  it('allows clearing className and style explicitly', () => {
    const child = (
      <div data-slot="x" className="base" style={{ color: 'red' }} />
    );
    const result = getCmpByAttr({
      children: child,
      value: 'x',
      props: { className: undefined, style: undefined },
    });
    expect(result?.props.className).toBeUndefined();
    expect(result?.props.style).toBeUndefined();
  });

  it('combines functions child-first, forwards arguments and returns the injected result', () => {
    const calls: string[] = [];
    const original = vi.fn((arg: string) => {
      calls.push(`child:${arg}`);
      return 1;
    });
    const injected = vi.fn((arg: string) => {
      calls.push(`parent:${arg}`);
      return 2;
    });
    const child = createElement('button', {
      'data-slot': 'x',
      onClick: original,
    });
    const result = getCmpByAttr({
      children: child,
      value: 'x',
      props: { onClick: injected },
    });
    expect((result?.props.onClick as (arg: string) => number)('event')).toBe(2);
    expect(calls).toEqual(['child:event', 'parent:event']);
  });

  it('supports overriding a function', () => {
    const original = vi.fn();
    const injected = vi.fn();
    const result = getCmpByAttr({
      children: <button data-slot="x" onClick={original} />,
      value: 'x',
      props: { onClick: injected },
      functionPropMerge: 'override',
    });
    expect(result?.props.onClick).toBe(injected);
    expect(original).not.toHaveBeenCalled();
  });

  it('preserves refs and keys when untouched and replaces injected refs', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ref = createRef<HTMLButtonElement>();
    const child = <button key="action" ref={ref} data-slot="x" />;
    const preserved = getCmpByAttr({
      children: child,
      value: 'x',
      props: { title: 'hello' },
    })!;
    const readRef = (element: ReactElement) =>
      Number(React.version.split('.')[0]) >= 19
        ? (element.props as { ref?: unknown }).ref
        : (element as unknown as { ref?: unknown }).ref;
    expect(readRef(preserved)).toBe(ref);
    expect(preserved.key).toBe('action');
    const callback = vi.fn();
    const replacement = vi.fn();
    const result = getCmpByAttr({
      children: <button ref={callback} data-slot="x" />,
      value: 'x',
      props: { ref: replacement },
    })!;
    expect(readRef(result)).toBe(replacement);
    expect(callback).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe('Slot and markers', () => {
  it('renders a complete layout with direct JSX and injected props on the server', () => {
    function Layout({ children }: { children: ReactNode }) {
      return (
        <div>
          <Slot name="header" props={{ className: 'heading' }}>
            {children}
          </Slot>
          <main>
            <Slot name="body">{children}</Slot>
          </main>
        </div>
      );
    }
    const html = renderToStaticMarkup(
      <Layout>
        <h1 data-slot="header">Hello</h1>
        <p data-slot="body">World</p>
      </Layout>,
    );
    expect(html).toBe(
      '<div><h1 data-slot="header" class="heading">Hello</h1><main><p data-slot="body">World</p></main></div>',
    );
  });

  it.each([false, true])('renders a fallback with findAll=%s', (findAll) => {
    expect(
      renderToStaticMarkup(
        <Slot name="missing" findAll={findAll} fallback={<b>Empty</b>}>
          {null}
        </Slot>,
      ),
    ).toBe('<b>Empty</b>');
    expect(
      renderToStaticMarkup(
        <Slot name="missing" findAll={findAll} fallback={0}>
          {null}
        </Slot>,
      ),
    ).toBe('0');
  });

  it('renders all selected matches', () => {
    const html = renderToStaticMarkup(
      <Slot name="x" findAll>
        <b data-slot="x">A</b>
        <i data-slot="x">B</i>
      </Slot>,
    );
    expect(html).toBe('<b data-slot="x">A</b><i data-slot="x">B</i>');
  });

  it('discovers markers before rendering and retains their children', () => {
    const Header = SlotUtils.createMarker('header');
    const element = (
      <Header className="base">
        <h1>Hello</h1>
      </Header>
    );
    expect(getCmpByAttr({ children: element, value: 'header' })).toBe(element);
    expect(
      renderToStaticMarkup(
        <Slot name="header" props={{ className: 'extra' }}>
          {element}
        </Slot>,
      ),
    ).toBe(
      '<div class="base extra" style="display:contents" data-slot="header"><h1>Hello</h1></div>',
    );
  });

  it('supports custom marker attributes and an explicit display style', () => {
    const Action = SlotUtils.createMarker('action', 'data-role');
    const element = <Action style={{ display: 'block' }}>Save</Action>;
    expect(
      getCmpByAttr({
        children: element,
        attribute: 'data-role',
        value: 'action',
      }),
    ).toBe(element);
    expect(renderToStaticMarkup(element)).toContain(
      'style="display:block" data-role="action"',
    );
  });

  it('keeps marker names fixed when supplied props conflict', () => {
    const Header = SlotUtils.createMarker('header');
    const element = <Header data-slot="other" />;
    expect(getCmpByAttr({ children: element, value: 'other' })).toBeNull();
    expect(getCmpByAttr({ children: element, value: 'header' })).toBe(element);
    expect(renderToStaticMarkup(element)).toContain('data-slot="header"');
  });
});

describe('validation and diagnostics', () => {
  it('validates fragments, nested children and markers using the same traversal', () => {
    const Header = SlotUtils.createMarker('header');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      SlotUtils.validate(
        <>
          <Header />
          <section>
            <div data-slot="body" />
          </section>
        </>,
        ['header', 'body', 'footer', 'footer'],
      ),
    ).toEqual(['footer']);
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Missing required slot: "footer"',
    );
  });

  it('accepts custom attributes and empty slot names', () => {
    const Empty = SlotUtils.createMarker('', 'data-role');
    expect(SlotUtils.validate(<Empty />, [''], 'data-role')).toEqual([]);
  });

  it('returns missing slots in production without logging', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    expect(SlotUtils.validate(null, ['header'])).toEqual(['header']);
    getCmpByAttr({ children: null, debug: true });
    expect(warn).not.toHaveBeenCalled();
    expect(debug).not.toHaveBeenCalled();
  });

  it('logs only when debug is enabled and works without a browser process global', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    getCmpByAttr({ children: null });
    expect(debug).not.toHaveBeenCalled();
    vi.stubGlobal('process', undefined);
    getCmpByAttr({ children: null, debug: true });
    expect(debug).toHaveBeenCalledOnce();
  });
});
