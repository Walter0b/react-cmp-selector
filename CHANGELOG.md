# Changelog

## 3.0.0 — Unreleased

### Breaking changes

- Make `getCmpByAttr` a regular function instead of an implicitly named hook.
- Remove the render-phase `onFound` callback.
- Return an empty array for an unmatched `findAll` query.
- Merge class names and styles; return the injected function's result from combined callbacks. Explicit refs replace rather than combine.
- Scope keys for flattened multiple matches to their source paths.
- Target ES2020 and ship separate ESM/CommonJS entry points.

### Fixes

- Avoid JSX-runtime subpath imports so native Node ESM works with React 17.
- Discover slot markers without executing their component functions.
- Use the same recursive search for selection and slot validation.
- Preserve original element identity when a single selection requires no overrides.
- Stop inspecting descendants and later elements after the first match.
- Guard diagnostics when a browser does not provide a `process` global.
- Replace README examples that incorrectly searched inside component output.
- Include the previously missing MIT license file in the package.

### Additions

- React 19 support alongside React 17 and 18; remove the unused React DOM peer dependency.
- Support `findAll` on `Slot`, including fallback rendering for empty results.
- Return missing slot names from validation in all environments.
- Add return-type overloads, typed div markers, behavior tests, SSR tests, package checks, and a React/Node compatibility CI matrix.
- Add a dependency lockfile and documented release workflow.

## 2.0.0 — 2025-04-11

- Add `Slot`, slot utilities, and configurable prop merging.
