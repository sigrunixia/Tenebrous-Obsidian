// Strips [[...]] wikilink syntax and returns just the link target.
// "[[Τατουάζ|Tattoos]]" -> "Τατουάζ"
// "Τατουάζ" -> "Τατουάζ"
export function wikilinkTarget(raw: unknown): string {
    const m = String(raw).match(/\[\[([^\]|]+)/);
    return (m ? m[1] : String(raw)).trim();
}

// Frontmatter list fields (types, categories, ...) come through as either a
// single string or an array, depending on how the note wrote it. Normalize.
export function arrayify<T>(v: T | T[] | null | undefined): T[] {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
}
