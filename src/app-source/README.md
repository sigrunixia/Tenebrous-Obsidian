## What this is

This is a raw dump of Obsidian's own stylesheets, kept so I can audit what my theme covers and what it doesn't. It is how I find CSS custom properties that Obsidian reads and I never set, and how I check whether a selector's default styling relies on a variable at all.

None of it gets `@use`'d, so it has no effect on the compiled `theme.css`, same as [`../lib/_upstream-palette.scss`](../lib/_upstream-palette.scss).

- `app-1.13.2.css` is the desktop stylesheet for Obsidian 1.13.2, one `cssRules` entry per line.
- `app-1.14.3.scss` is the one for 1.14.3, spread over about 22,000 lines instead of one rule per line.
- `publish-app.css` is the stylesheet Obsidian Publish ships, with its own variables like `--page-width`.

I pulled the desktop stylesheet out of the running app's own DOM and not out of `app.asar`, because the asar is only the Electron shell and the real UI stylesheet isn't a plain file on disk. The filename tracks the Obsidian version it came from, `app-<version>.css`, and I keep the old versions around instead of overwriting them. They are small, and they let me diff what changed between Obsidian releases.

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

Get `<version>` from `require('electron').remote.app.getVersion()` in the same `obsidian eval` session, because `app.appVersion` comes back `undefined` in this context.

Re-run it after an Obsidian update if I suspect new variables or selectors have been introduced, then re-diff against `src/theme/dark/` to catch newly unthemed surfaces. The `--color-base-*` fix in this repo's history is a good example of what that audit turns up.
