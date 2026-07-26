## What this is

A raw dump of Obsidian's own core stylesheet (`app://obsidian.md/app.css`), kept as a
reference for auditing what our theme does and doesn't cover -- e.g. finding CSS custom
properties Obsidian's core reads that we never set, or checking whether a selector's
default styling relies on a variable at all.

Not `@use`'d anywhere -- it does not affect the compiled `theme.css`, same as
[`../_upstream-palette.scss`](../_upstream-palette.scss).

- Extracted from: Obsidian 1.13.2 (desktop, macOS)
- Extracted: one `cssRules` entry per line, via the running app's own DOM (not asar
  extraction -- the shipped `app.asar` is just the Electron shell; the actual UI stylesheet
  isn't a plain file on disk).

## Regenerating

With Obsidian running and the `obsidian` CLI available:

```sh
obsidian eval vault="<vault name>" code="
const fs = require('fs');
const s = Array.from(document.styleSheets).find(s => s.href && s.href.includes('app.css'));
const text = Array.from(s.cssRules).map(r => r.cssText).join('\n');
fs.writeFileSync('/absolute/path/to/src/app-source/app.css', text);
'wrote ' + text.length + ' bytes';
"
```

Re-run this after major Obsidian updates if you suspect new variables or selectors have
been introduced, then re-diff against `_dark.scss` / `_light.scss` to catch newly
unthemed surfaces (see the `--color-base-*` fix in this repo's history for an example of
what that audit turns up).
