import { IMG_PATHS } from '../../baked-data';
import { wikilinkTarget } from '../../lib/wikilink';

export interface CoverInfo {
    url: string;
    isIcon: boolean;
}

// Exact match first (the common case, a single object property lookup).
// Falls back to a case-insensitive scan of IMG_PATHS' own keys only when
// that fails — e.g. a wikilink whose case doesn't exactly match the real
// filename ("This Is How I Obsidian.png" vs the actual "This is how I
// obsidian.png"). Scanning is fine here: it only runs on an already-rare
// mismatch, not on every cover lookup, so it's not worth pre-baking a
// lowercase duplicate of every entry into the shipped index for.
function findImagePath(filename: string): string | null {
    if (!IMG_PATHS) return null;
    if (IMG_PATHS[filename]) return IMG_PATHS[filename];
    const lower = filename.toLowerCase();
    const key = Object.keys(IMG_PATHS).find((k) => k.toLowerCase() === lower);
    return key ? IMG_PATHS[key] : null;
}

// Every SVG in Attachments is a flat icon/logo (Lucide, brand marks, ...),
// never a photo -- so extension is a reliable, no-config way to tell
// icons from photos and give each its own cover treatment.
export function coverInfo(entry: IndexEntry, prop: string | null): CoverInfo | null {
    if (!prop) return null;
    const raw = entry.fm[prop];
    if (!raw) return null;
    const filename = wikilinkTarget(raw).split('/').pop();
    const imgPath = filename ? findImagePath(filename) : null;
    if (!imgPath || !publish.site) return null;
    return { url: publish.site.getInternalUrl(imgPath), isIcon: /\.svg$/i.test(imgPath) };
}
