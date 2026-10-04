import type { GroupFn } from './card-options';
import { coverInfo } from './cover-image';
import { makeEntryLink, propDisplayValue } from './entry-values';

function renderCardGrid(
    el: HTMLElement,
    entries: IndexEntry[],
    cover: string | null,
    lineProps: string[],
    properties: Record<string, string>,
): void {
    const grid = document.createElement('div');
    grid.className = 'hub-backlink-cards';
    for (const entry of entries) {
        const card = document.createElement('div');
        card.className = 'hub-backlink-card';
        const info = coverInfo(entry, cover);
        if (info) {
            const coverEl = document.createElement('div');
            coverEl.className = 'hub-backlink-card-cover';

            const image = document.createElement('div');
            image.className = 'hub-backlink-card-cover-image';

            if (info.isIcon) {
                // A mask, not a background image: renders in whatever
                // color CSS gives it (var(--text-muted)), instead of
                // baking in black from the SVG's unresolved currentColor.
                coverEl.classList.add('hub-backlink-card-cover--icon');
                image.style.webkitMaskImage = `url(${info.url})`;
                image.style.maskImage = `url(${info.url})`;
            } else {
                const backdrop = document.createElement('div');
                backdrop.className = 'hub-backlink-card-cover-backdrop';
                backdrop.style.backgroundImage = `url(${info.url})`;
                coverEl.appendChild(backdrop);
                image.style.backgroundImage = `url(${info.url})`;
            }

            coverEl.appendChild(image);

            card.appendChild(coverEl);
        }
        const title = document.createElement('div');
        title.className = 'hub-backlink-card-title';
        title.appendChild(makeEntryLink(entry));
        card.appendChild(title);

        for (const prop of lineProps) {
            const value = propDisplayValue(entry, prop);
            if (!value) continue;
            const line = document.createElement('div');
            line.className = 'hub-backlink-card-line';
            const label = properties[prop];
            line.textContent = label ? `${label}: ${value}` : value;
            card.appendChild(line);
        }

        grid.appendChild(card);
    }
    el.appendChild(grid);
}

export function renderCards(
    el: HTMLElement,
    entries: IndexEntry[],
    cover: string | null,
    groupFn: GroupFn | null,
    lineProps: string[],
    properties: Record<string, string>,
): void {
    el.empty();
    el.addClass('hub-backlink-cards-container');
    if (!groupFn) {
        renderCardGrid(el, entries, cover, lineProps, properties);
        return;
    }
    const groups = new Map<string, IndexEntry[]>();
    for (const entry of entries) {
        const key = groupFn(entry) || '';
        if (!groups.has(key)) groups.set(key, []);
        (groups.get(key) as IndexEntry[]).push(entry);
    }
    groups.forEach((groupEntries, key) => {
        if (key) {
            const heading = document.createElement('div');
            heading.className = 'hub-backlink-group-heading';
            heading.textContent = key;
            el.appendChild(heading);
        }
        renderCardGrid(el, groupEntries, cover, lineProps, properties);
    });
}
