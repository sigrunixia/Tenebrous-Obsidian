// ── Keyboard scrolling ───────────────────────────────────────────────────
// Publish renders long pages virtually. Its scroll handler (app.js,
// MarkdownPreviewRenderer.onScroll) refreshes the DOM once you have moved
// more than half a viewport (500px minimum, so 250px) from the last refresh.
// The refresh detaches off-screen sections, rewrites the pusher's margin and
// the sizer's min-height, and writes scrollTop back. In Safari the arrow keys
// stop scrolling right after the first refresh, even though the focused
// element is the scroller and nothing cancels the key. The mouse wheel keeps
// working, and so does scrolling from code, so this handles the scrolling
// keys itself. It is the same on stock Publish sites such as help.obsidian.md.
// The page's own scroller is the first match; embeds nest inside it.
const SCROLLER = '.markdown-preview-view';
const ARROW_STEP_PX = 40;
const PAGE_FRACTION = 0.9;
const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]';
const ACTIVATES_ON_SPACE = 'button, a, summary';

function pageStep(scroller: Element): number {
    return scroller.clientHeight * PAGE_FRACTION;
}

function onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    const scroller = document.querySelector(SCROLLER);
    const target = event.target;
    if (!scroller || !(target instanceof Element)) return;
    if (!(target === document.body || target === document.documentElement || scroller.contains(target))) return;
    if (target.closest(TEXT_ENTRY)) return;

    // Shift plus an arrow key extends a text selection, so leave it alone.
    const isSpace = event.key === ' ';
    if (event.shiftKey && !isSpace) return;

    let delta: number | null = null;
    switch (event.key) {
        case 'ArrowDown': delta = ARROW_STEP_PX; break;
        case 'ArrowUp': delta = -ARROW_STEP_PX; break;
        case 'PageDown': delta = pageStep(scroller); break;
        case 'PageUp': delta = -pageStep(scroller); break;
        case ' ':
            if (target.closest(ACTIVATES_ON_SPACE)) return;
            delta = event.shiftKey ? -pageStep(scroller) : pageStep(scroller);
            break;
        case 'Home':
            scroller.scrollTo({ top: 0 });
            event.preventDefault();
            return;
        case 'End':
            scroller.scrollTo({ top: scroller.scrollHeight });
            event.preventDefault();
            return;
        default:
            return;
    }

    scroller.scrollBy({ top: delta });
    event.preventDefault();
}

export function mountKeyboardScroll(): void {
    window.addEventListener('keydown', onKeydown);
}
