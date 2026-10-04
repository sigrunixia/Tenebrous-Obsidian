export type Formulas = Record<string, string>;
export type GroupFn = (entry: IndexEntry) => string | null;

export function parseFormulas(source: string): Formulas {
    const formulas: Formulas = {};
    const block = source.match(/formulas:\s*\n((?:[ \t]+\S.*\n?)+)/);
    if (!block) return formulas;
    block[1].split('\n').forEach((line) => {
        const m = line.match(/^\s*(\w+):\s*(.+)$/);
        if (m) formulas[m[1]] = m[2].trim();
    });
    return formulas;
}

// `image: formula.<Name>` or `image: note.<prop>`.
export function coverProp(source: string, formulas: Formulas): string | null {
    let m = source.match(/image:\s*formula\.(\w+)/);
    if (m) return formulas[m[1]] || null;
    m = source.match(/image:\s*note\.(\S+)/);
    return m ? m[1] : null;
}

// Maps a bare property name (e.g. "modified", from either "modified:"
// or "note.modified:" in the source) to its displayName, e.g. "Last
// modified". "file.name" is deliberately excluded — that's the card title,
// handled separately, never rendered as an extra line.
export function parseProperties(source: string): Record<string, string> {
    const map: Record<string, string> = {};
    const block = source.match(/properties:\s*\n((?:[ \t]+\S.*\n?)+)/);
    if (!block) return map;
    const re = /^[ \t]+(\S+):\s*\n[ \t]+displayName:\s*(.+)$/gm;
    let m;
    while ((m = re.exec(block[1]))) {
        const key = m[1].split('.').pop() as string;
        if (key !== 'name') map[key] = m[2].trim();
    }
    return map;
}

// The `order:` list under a view determines which properties show on each
// card and in what order — first entry is the title (already handled via
// makeEntryLink), everything after that renders as an extra line.
export function parseOrder(source: string): string[] {
    const block = source.match(/order:\s*\n((?:[ \t]+-.*\n?)+)/);
    if (!block) return [];
    return block[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('- '))
        .map((l) => (l.slice(2).trim().split('.').pop() as string))
        .filter((prop) => prop !== 'name');
}

// Only supports the one formula shape actually in use: `<prop>.year`.
// Anything else falls back to no grouping rather than a wrong grouping.
export function buildGroupFn(source: string, formulas: Formulas): GroupFn | null {
    const m = source.match(/groupBy:\s*\n\s*property:\s*formula\.(\w+)/);
    if (!m) return null;
    const expr = formulas[m[1]];
    const ym = expr && expr.match(/^(\S+)\.year$/);
    if (!ym) return null;
    const prop = ym[1];
    return (entry) => {
        const d = new Date(entry.fm[prop]);
        return isNaN(d.getTime()) ? null : String(d.getFullYear());
    };
}
