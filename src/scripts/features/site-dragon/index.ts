import { hideUntilStyled } from '../../lib/hide-until-styled';

// A vault attachment, since Publish only serves files that are published.
// The repo keeps the full size original in assets/; this one is resized.
const DRAGON_PATH = 'Admin/Attachments/tenebrous-dragon.png';
const DRAGON_WIDTH = 520;
const DRAGON_HEIGHT = 567;

function buildDragon(): HTMLElement | null {
    if (!publish.site) return null;
    const wrap = document.createElement('div');
    wrap.className = 'site-dragon';
    const img = document.createElement('img');
    img.src = publish.site.getInternalUrl(DRAGON_PATH);
    img.alt = '';
    img.width = DRAGON_WIDTH;
    img.height = DRAGON_HEIGHT;
    img.draggable = false;
    wrap.appendChild(img);
    return hideUntilStyled(wrap);
}

// The dragon sits at the top of the right column, above the social links row
// (or above search when that row is not there yet). Publish swaps chrome
// contents as you navigate, so this checks on every DOM change and puts the
// dragon back when it goes missing, the same way the social links do. The
// social links insert themselves directly above search, so the two stay in
// order whichever one gets there first.
function ensureDragon(): void {
    const column = document.querySelector('.site-body-right-column');
    if (!column) return;
    const anchor = column.querySelector('.site-social-links:not(.site-social-links-bar)')
        || column.querySelector('.search-view-outer');
    if (!anchor) return;

    const prev = anchor.previousElementSibling;
    if (prev && prev.classList.contains('site-dragon')) return;
    document.querySelectorAll('.site-dragon').forEach((el) => el.remove());
    const dragon = buildDragon();
    if (dragon) anchor.insertAdjacentElement('beforebegin', dragon);
}

export function mountSiteDragon(): void {
    ensureDragon();
    new MutationObserver(ensureDragon).observe(document.body, { childList: true, subtree: true });
}
