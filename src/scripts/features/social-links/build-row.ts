import { hideUntilStyled } from '../../lib/hide-until-styled';
import { SOCIAL_LINKS } from './links';

export function buildSocialRow(modifier?: string): HTMLDivElement {
    const NS = 'http://www.w3.org/2000/svg';
    const row = document.createElement('div');
    row.className = 'site-social-links' + (modifier ? ' ' + modifier : '');

    SOCIAL_LINKS.forEach(({ label, href, path, stroke }) => {
        const a = document.createElement('a');
        a.className = 'site-social-link';
        a.href = href;
        if (!href.startsWith('mailto:')) {
            a.target = '_blank';
            a.rel = 'noopener me';
        }
        a.setAttribute('aria-label', label);
        a.title = label;

        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '18');
        svg.setAttribute('height', '18');
        svg.setAttribute('aria-hidden', 'true');
        if (stroke) {
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');
            stroke.forEach(([tag, attrs]) => {
                const el = document.createElementNS(NS, tag);
                Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
                svg.appendChild(el);
            });
        } else {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', path as string);
            p.setAttribute('fill', 'currentColor');
            svg.appendChild(p);
        }
        a.appendChild(svg);
        row.appendChild(a);
    });
    return hideUntilStyled(row);
}
