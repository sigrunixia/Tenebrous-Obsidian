// ── Strip internal links that point to unpublished (publish: false) notes ──
// Obsidian Publish only resolves links between published notes, so a link to
// an unpublished note already carries `is-unresolved` the same way a broken
// link would. This turns those into plain text instead of a dead-looking link.
// The source note itself is never touched.
//
// Publish assigns `is-unresolved` to internal links *after* running custom
// markdown post-processors, in the same synchronous pass (post-processors
// run, then Publish's own code loops over every a.internal-link and toggles
// the class). Deferring to a microtask lets that assignment finish first, so
// the class is actually there by the time we look for it.
export function stripUnresolvedLinks(): void {
    publish.registerMarkdownPostProcessor((el) => {
        queueMicrotask(() => {
            el.querySelectorAll('a.internal-link.is-unresolved').forEach((link) => {
                const span = document.createElement('span');
                span.className = 'unresolved-link-text';
                span.innerHTML = link.innerHTML;
                link.replaceWith(span);
            });
        });
    });
}
