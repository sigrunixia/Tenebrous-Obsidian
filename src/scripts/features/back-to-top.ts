import { hideUntilStyled } from '../lib/hide-until-styled';

// ── Back to top (phones) ─────────────────────────────────────────────────
// A floating button that appears after scrolling. CSS shows it at 750px and
// under only (see _publish.scss); this file does the wiring. Publish nests
// several overflow containers and which one scrolls depends on the layout,
// so the scroller is found at runtime, and corrected from scroll events
// (which do not bubble, hence the capture listener).
const UP_ARROW = ['m5 12 7-7 7 7', 'M12 19V5'];
const SCROLL_SHOW_PX = 400;

function pickScroller(): Element | null {
    const candidates: (Element | null)[] = [
        '.markdown-preview-view', '.render-container', '.publish-renderer', '.published-container',
    ].map((sel) => document.querySelector(sel)).filter(Boolean);
    candidates.push(document.scrollingElement);
    return candidates.find((el) => el && el.scrollHeight - el.clientHeight > 50) || null;
}

function upIcon(): SVGSVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '22');
    svg.setAttribute('height', '22');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    UP_ARROW.forEach((d) => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        svg.appendChild(path);
    });
    return svg;
}

// Jump, do not animate. Publish renders long pages in pieces as you scroll,
// so the height above you keeps changing, and a smooth scroll gets cut short
// partway up. Which element scrolls depends on Publish's layout and cannot
// be assumed, so this finds every element that has scrolled at all (one scan
// of the page per tap, nothing while idle), sets each to 0, and keeps
// resetting for a few frames while the page settles.
function scrolledElements(): Element[] {
    const found = Array.from(document.querySelectorAll('body *')).filter((el) => el.scrollTop > 0);
    [document.scrollingElement, document.documentElement, document.body].forEach((el) => {
        if (el && el.scrollTop > 0 && !found.includes(el)) found.push(el);
    });
    return found;
}

function scrollToTop(): void {
    let frames = 0;
    (function step() {
        const moved = scrolledElements();
        moved.forEach((el) => { el.scrollTop = 0; });
        window.scrollTo(0, 0);
        if (moved.length && frames++ < 30) requestAnimationFrame(step);
    }());
}

function makeTopButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'back-to-top-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Back to top');
    button.appendChild(upIcon());
    button.addEventListener('click', () => scrollToTop());
    document.body.appendChild(button);
    return hideUntilStyled(button);
}

export function mountBackToTop(): void {
    let scroller: Element | null = null;
    const topButton = makeTopButton();

    function updateBackToTop(): void {
        scroller = scroller && document.contains(scroller) ? scroller : pickScroller();
        const top = scroller ? scroller.scrollTop : 0;
        topButton.classList.toggle('is-visible', top > SCROLL_SHOW_PX);
    }

    document.addEventListener('scroll', (event) => {
        const target = event.target;
        if (target instanceof Element && target.scrollHeight > target.clientHeight + 50) scroller = target;
        updateBackToTop();
    }, true);
    window.addEventListener('resize', updateBackToTop);
    // Page changes swap the content and its height without a scroll event.
    new MutationObserver(updateBackToTop).observe(document.body, { childList: true, subtree: true });
}
