export interface SortSpec {
    prop: string;
    dir: 'ASC' | 'DESC';
}

// One property plus a direction.
export function sortSpec(source: string): SortSpec | null {
    const m = source.match(/sort:\s*\n\s*-\s*property:\s*(\S+)\s*\n\s*direction:\s*(ASC|DESC)/);
    return m ? { prop: m[1], dir: m[2] as 'ASC' | 'DESC' } : null;
}

export function sortValue(entry: IndexEntry, prop: string): number | string {
    if (prop === 'modified') return entry.mtime;
    const v = entry.fm[prop];
    const d = Date.parse(v);
    return isNaN(d) ? (v || '') : d;
}

export function sortEntries(entries: IndexEntry[], sort: SortSpec | null): IndexEntry[] {
    return entries.slice().sort((a, b) => {
        if (!sort) return b.mtime - a.mtime;
        const av = sortValue(a, sort.prop), bv = sortValue(b, sort.prop);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.dir === 'DESC' ? -cmp : cmp;
    });
}

export function limitSpec(source: string): number | null {
    const m = source.match(/limit:\s*(\d+)/);
    return m ? parseInt(m[1], 10) : null;
}
