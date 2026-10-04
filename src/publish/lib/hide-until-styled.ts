// The script can run before publish.css has finished loading. Anything it
// inserts then renders unstyled for a moment: SVGs with no size fill the
// width (the big flash of the email icon) and the back-to-top button shows
// as a raw button. So icons get explicit sizes as attributes (CSS still
// overrides them), and inserted elements stay invisible until the window's
// load event, which waits for stylesheets. After load there is nothing to
// wait for and this does nothing.
export function hideUntilStyled<T extends HTMLElement>(el: T): T {
    if (document.readyState === 'complete') return el;
    el.style.visibility = 'hidden';
    window.addEventListener('load', () => { el.style.visibility = ''; }, { once: true });
    return el;
}
