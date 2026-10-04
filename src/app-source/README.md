## What this is

A raw dump of Obsidian's own core stylesheet (`app://obsidian.md/app.css`), kept as a
reference for auditing what our theme does and doesn't cover -- e.g. finding CSS custom
properties Obsidian's core reads that we never set, or checking whether a selector's
default styling relies on a variable at all.

Not `@use`'d anywhere -- it does not affect the compiled `theme.css`, same as
[`../lib/_upstream-palette.scss`](../lib/_upstream-palette.scss).

- Extracted: one `cssRules` entry per line, via the running app's own DOM (not asar
  extraction -- the shipped `app.asar` is just the Electron shell; the actual UI stylesheet
  isn't a plain file on disk).
- Filename tracks the Obsidian version it came from: `app-<version>.css` (desktop, macOS).
  Keep old versions around rather than overwriting -- they're small and let you diff what
  changed between Obsidian releases.

## Regenerating

With Obsidian running and the `obsidian` CLI available:

```sh
obsidian eval vault="<vault name>" code="
const fs = require('fs');
const s = Array.from(document.styleSheets).find(s => s.href && s.href.includes('app.css'));
const text = Array.from(s.cssRules).map(r => r.cssText).join('\n');
fs.writeFileSync('/absolute/path/to/src/app-source/app-<version>.css', text);
'wrote ' + text.length + ' bytes';
"
```

Get `<version>` from `require('electron').remote.app.getVersion()` in the same `obsidian
eval` session (`app.appVersion` returns `undefined` in this context).

Re-run this after Obsidian updates if you suspect new variables or selectors have been
introduced, then re-diff against `_dark.scss` / `_light.scss` to catch newly unthemed
surfaces -- see the `--color-base-*` fix in this repo's history for an example of what
that audit turns up, and `_ref-*.scss` for the current scaffold of known-unthemed vars.
