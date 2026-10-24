# Security Policy

## Supported versions

Security fixes are released for the latest published major version. Upgrade to the newest release
before reporting an issue in an older version.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's
["Report a vulnerability"](https://github.com/Mister-Hope/flowchart.ts/security/advisories/new)
advisory form instead of opening a public issue. Include the DSL input, the rendered DOM (or a
minimal reproduction), and the browser/version used.

## Threat model

`flowchart.ts` parses a DSL and writes the result into SVG DOM nodes. The DSL is **untrusted
input** when it is authored by end users or third-party systems; the `draw()` options
(`callbacks`, styles, container) are provided by the host application and are trusted code.

The following inputs are sanitized before they reach the DOM:

- node links (`:>`) and link targets (`[blank]`, named targets);
- connection styles (`@>` JSON): only presentation attributes from an allowlist are applied;
- click callback names (`:$callback`): resolved from the `callbacks` option first, then from
  `globalThis`, and only invoked when they resolve to functions;
- node keys written as DOM ids: keys that would break selectors or clobber globals are not
  written as ids.

The renderer never uses `innerHTML`; node text and labels are rendered as text nodes.

## Residual risks and non-goals

- `flowchart.ts` renders SVG, it does not sandbox it. A page that inserts the generated SVG into
  an untrusted document remains responsible for that document's CSP and sanitization policy.
- Serializing rendered SVG and re-inserting it as HTML can decode HTML entities and restore
  protocols that the DOM-level checks rejected (for example `javascript&#58;`). Do not round-trip
  untrusted charts through HTML strings.
- Do not pass untrusted strings in `draw()` options (for example `class`), and only register
  trusted functions in `callbacks`.
- Browser extensions, a compromised dependency, or a compromised host page are outside the
  library's control.
