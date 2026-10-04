import { buildSocialRow } from './build-row';

// The vault runs with navigation off, so Publish hides the whole left
// column (site name included) and puts search in the right column, which
// only exists on pages with an outline or graph. Two copies of the row, one
// per layout, and CSS shows whichever fits the width (see _publish.scss).
//   - Wide screens: directly above the right column's search box.
//   - Phones (750px and under): a strip under the top bar, since the bar is
//     too narrow to hold six icons beside the name and search.
// Publish swaps chrome contents as you navigate, so this checks on every DOM
// change and puts each row back when it goes missing, rather than running
// once. It is a couple of cheap queries per mutation.
function ensureSocialLinks(): void {
    const search = document.querySelector('.site-body-right-column .search-view-outer');
    if (search) {
        const prev = search.previousElementSibling;
        if (!(prev && prev.classList.contains('site-social-links'))) {
            document.querySelectorAll('.site-social-links:not(.site-social-links-bar)').forEach((el) => el.remove());
            search.insertAdjacentElement('beforebegin', buildSocialRow());
        }
    }

    const header = document.querySelector('.site-header');
    if (header) {
        const next = header.nextElementSibling;
        if (!(next && next.classList.contains('site-social-links-bar'))) {
            document.querySelectorAll('.site-social-links-bar').forEach((el) => el.remove());
            header.insertAdjacentElement('afterend', buildSocialRow('site-social-links-bar'));
        }
    }
}

export function mountSocialLinks(): void {
    ensureSocialLinks();
    new MutationObserver(ensureSocialLinks).observe(document.body, { childList: true, subtree: true });
}
