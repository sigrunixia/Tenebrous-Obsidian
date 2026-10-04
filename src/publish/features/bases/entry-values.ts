import { formatDate } from '../../lib/dates';
import { arrayify, wikilinkTarget } from '../../lib/wikilink';

// modified is special-cased to entry.mtime (already resolved at build
// time, with the file-mtime fallback build-index.js applies). Any other
// property reads straight from entry.fm: date-shaped strings get the same
// formatting, wikilinks get unwrapped, arrays get joined.
export function propDisplayValue(entry: IndexEntry, prop: string): string | null {
    if (prop === 'modified') return formatDate(entry.mtime);
    const raw = entry.fm[prop];
    if (raw == null || raw === '') return null;
    if (!Array.isArray(raw) && /^\d{4}-\d{2}-\d{2}/.test(String(raw))) {
        const d = Date.parse(raw);
        if (!isNaN(d)) return formatDate(d);
    }
    return arrayify(raw).map(wikilinkTarget).join(', ');
}

// An internal-link with data-href lets Publish's own router resolve the href
// and the unresolved state, same as any ordinary wikilink.
export function makeEntryLink(entry: IndexEntry): HTMLAnchorElement {
    const a = document.createElement('a');
    a.className = 'internal-link';
    a.textContent = entry.basename;
    a.setAttribute('data-href', entry.basename);
    return a;
}
