# AGENTS.md

Project internals for maintainers and coding agents. User-facing documentation lives in
[README.md](./README.md); do not put release/CI/architecture details there.

## Project

`flowchart.ts` is a TypeScript implementation of the flowchart.js DSL with an **in-house SVG
renderer**. It has **no runtime dependencies**, is **ESM-only**, and targets modern browsers
(SVG + ES2022). The package is published to npm as `flowchart.ts`.

## Toolchain

- Package manager: pnpm `12.15.0` (`packageManager` + `devEngines.packageManager`).
- Node: `package.json#devEngines.runtime` is `^22.23.4 || ^24.22.1 || ^26.12.1`; README only promises
  `>= 22` to users.
- TypeScript is the native 7 preview (`typescript@7.0.2`). `tsdown@0.23.1` is **pinned**: newer
  tsdown versions use the classic TS API in `rolldown-plugin-dts` and break with TS 7.
- `oxlint@1.88.0` + `oxfmt@0.73.0` + `oxlint-tsgolint` via `oxc-config-hope`; pinned deliberately
  because newer oxlint versions add noisy rules (style/vitest) that are not part of this repo's
  conventions.
- Tests: `vitest@5` with `happy-dom`; text measurement falls back to deterministic metrics because
  happy-dom has no native `getBBox`.
- `pnpm build` runs tsdown **and publint** (`publint: true` in `tsdown.config.ts`), so packaging
  mistakes fail the build.

## Commands

```bash
pnpm install       # install dependencies
pnpm ci            # frozen-lockfile install (CI)
pnpm dev           # vite dev server for the examples in `template/`
pnpm build         # tsdown bundle + d.ts, then publint
pnpm test          # vitest run
pnpm test:coverage # vitest run --coverage
pnpm test -u       # update snapshots after an intentional layout change
pnpm lint          # oxlint --fix + oxfmt
pnpm lint:check    # oxlint + oxfmt --check
pnpm type-check    # tsc --noEmit
pnpm deps:update   # ncu -u + pnpm install
```

## Architecture

- `src/parse/` — DSL parsing:
  - `lines.ts` splits/joins input lines (backslash continuations, continuation lines)
  - `definition.ts` parses node definitions (params, text, links, flowstates)
  - `flow.ts` applies connections (branches, directions, annotations)
  - `style.ts` applies per-line style overrides
  - `draw.ts` builds the display-symbol tree from the parsed graph
  - `index.ts` exposes `parse()` and the `Chart` object
- `src/symbols/` — rendered nodes:
  - `symbol.ts` base class: shape setup, measurement, option lookup, line drawing
  - `line-routing.ts` ordered route rules for connection paths
  - `placement.ts` top/bottom/left/right/beside positioning and overlap shifting
  - `crossing.ts` hop-over bends for crossing lines
  - `node-links.ts` link/target and click-callback binding
  - one file per node type; `index.ts` is the barrel
- `src/render/` — in-house SVG renderer: `element.ts` (attributes/link wrappers), `rect.ts`,
  `path.ts`, `text.ts`, `text-metrics.ts`, `markers.ts`, `set.ts`, `paper.ts`
- `src/chart.ts` — layout orchestration: symbol alignment, render order, viewBox sizing
- Graph construction (`parse/draw.ts`) uses an explicit stack and expands each parsed symbol once, so
  cyclic definitions terminate; `FlowChartSymbol.render()` walks plain `next` chains iteratively.
  Extremely deep condition / parallel nesting still uses recursive layout and is bounded by the JS
  stack (~4k branch nodes).
- `src/action.ts` — path/line drawing primitives shared by symbols
- `__tests__/` — unit + regression tests

## Testing

- `__tests__/fixtures/charts.ts` is the DSL corpus (node types, directions, annotations, links,
  flowstates, text wrapping, arrow variants, styles, cycles, crossings, ...).
- `__tests__/snapshots.spec.ts` snapshots the **full rendered DOM and geometry** (SVG sizing/viewBox,
  every element's attributes including path data, group transforms, text/tspan coordinates, links,
  arrow markers). Layout refactors have to keep that output stable; only update snapshots with
  `pnpm test -u` when a layout change is intentional.
- `render-more.spec.ts` covers options/lifecycle, multiple charts, marker isolation, callbacks and
  connection details; parser edge cases live in `parse.spec.ts`.
- CI runs `pnpm test:coverage`; `TEST_REPORT=true` switches vitest to JUnit + Cobertura output for
  Codecov, and `BUNDLE_ANALYSIS=true` enables Codecov bundle analysis during `pnpm build`.
  `vitest.config.ts` enforces **100%** statements, branches, functions and lines, so
  `pnpm test:coverage` fails when new code lands untested.
- Coverage is kept at 100% without `istanbul ignore` directives: a branch that normal input can
  never reach is removed instead of hidden. Environment-dependent fallbacks (no DOM, throwing
  `getBBox`, non-finite boxes) are exercised by unit tests that stub the browser API, and the
  remaining defensive paths are reachable through documented programmatic mutations of the parsed
  options. `eslint-disable` / `oxlint-disable` stay forbidden.
- `__tests__/fixtures/charts.ts` holds the main corpus; sizeable fixture groups that do not use the
  shared `EXAMPLES` / `ALL_NODE_TYPES` inputs live in `charts-extra.ts` because of the per-file
  line limit. `render-primitives.spec.ts` unit-tests renderer internals (text anchors, path
  trimming, links, sets, markers, sizing) directly.
- The `routing-*` fixtures specifically exercise every `line-routing.ts` rule.
- `pnpm test:browser` runs the Playwright smoke tests in `e2e/` against Chromium (native text metrics
  in visible / hidden / detached containers and arrow markers). `e2e/*.e2e.ts` is used so oxlint
  does not treat these files as Vitest specs; `playwright.config.ts` starts `e2e/vite.config.ts`,
  which serves the built `dist/` bundle. CI installs Chromium for the Node 24 job only.
- The renderer was cross-checked against the legacy raphael implementation (screenshots + geometry
  for the template examples, plus a 33-fixture browser diff). If you touch text metrics, routing or
  placement, validate the rendered output against that baseline again; the ad-hoc Playwright
  harness was not committed.

## Conventions

- Named exports in `src/symbols/` (`index.ts` uses `export *`); no `export default` for node classes.
- Renderer attributes: `setAttr(name, value)` for single values, `setAttrs(record)` only for batches;
  subclasses implement `applyAttr`.
- Numeric attribute parsing lives in `src/utils.ts` (`toNumber`), together with `deepAssign`.
- `oxlint.config.ts` intentionally has **no file-scoped overrides**; keep it that way.
- No `eslint-disable` / `oxlint-disable` comments anywhere; fix the underlying issue instead.
- The DSL is untrusted input: every value that can reach a DOM attribute, a URL or a callback must
  go through `src/security.ts` (link/target validation, `sanitizeLineStyle`, `isSafeDomId`). Never
  add an `innerHTML` path, and never write `on*`/`style`/`href` attributes from raw DSL values.
- Bundle size matters (the user rejected a `ts-deepmerge` dependency for +0.46 kB gzip). Current
  runtime bundle is ~43.8 kB min / ~12.8 kB gzip; avoid adding runtime dependencies and check
  `pnpm build` output when touching shared code.

## Releasing

Publishing uses **npm Trusted Publishing (OIDC)**; no `NPM_TOKEN` secret is stored in the repo.

One-time setup (npmjs.com → package settings → Trusted publishing → GitHub Actions):

- repository: `Mister-Hope/flowchart.ts`
- workflow: `publish.yml`
- environment: leave empty

Run a release manually: **Actions → Publish → Run workflow** from `main`:

- `bump`: `patch` / `minor` / `major`, a `pre*` bump, or `none` to publish the current version again
- `preid`: prerelease identifier for pre* bumps (e.g. `beta`)
- `dist_tag`: npm dist-tag, e.g. `next` for a prerelease. **Required for prereleases** — the
  workflow refuses to publish a `-` version without an explicit tag, so it cannot silently land on
  `latest`; stable versions default to `latest`.
- `dryrun`: bumps `package.json` locally without a commit/tag and runs `pnpm publish --dry-run`

What the workflow (`.github/workflows/publish.yml`) does:

1. rejects non-maintainer actors and non-`main` branches, then runs `pnpm ci`, lint, type-check,
   tests and build;
2. bumps `package.json` with `pnpm version <bump> --no-git-tag-version` (no commit or tag yet);
3. adds the new version section to `CHANGELOG.md` with
   `changelogen --output CHANGELOG.md -r <version> --from <previous tag>`;
4. commits `package.json` + `CHANGELOG.md` as `chore: release v<version>`, tags it and pushes the
   commit + tag to `main` (needs `contents: write`);
5. resolves the npm dist-tag (`latest` for stable versions, an explicit tag for prereleases), then
   runs `pnpm publish --access public --provenance --tag <dist-tag>`, authenticated via OIDC
   (`id-token: write`) with provenance attached by pnpm;
6. syncs the GitHub Release from the generated changelog with `changelogen gh release <version>`
   (prereleases are marked with `gh release edit --prerelease`). Because the release is generated
   from `CHANGELOG.md`, no release notes artifact or custom script is involved.

`CHANGELOG.md` is generated: fix the commit message instead of editing the file. Preview the next
entry locally with `pnpm changelog` (a `changelogen --no-output` run). `bump = none` retries do not
rewrite the release commit; they only re-run the publish and the GitHub Release sync (with a
`gh release create --generate-notes` fallback for releases older than the changelog automation).

A failed publish can be retried with `bump = none` without creating another version commit. Branch
protection must allow the workflow to push the release commit/tag directly to `main`.

## Git

Conventional commit messages. Do not push unless asked; publishing only happens through the
Publish workflow.
