// Bases filters on a date against today(), for the trips hub. Two shapes are
// understood, matching how Τα ταξίδια.md writes them:
//   `<prop> > today()` with `<prop>.isEmpty()`  -- not started yet (planning)
//   `<prop> <= today()` with `!<prop>.isEmpty()` -- already started
// Anything else is ignored, so a block without these filters is untouched.
// Today is the visitor's own calendar day.
export type DateFilter = 'upcoming' | 'started';

export function dateFilter(source: string): { prop: string; kind: DateFilter } | null {
    let m = source.match(/(\w+)\s*>\s*today\(\)/);
    if (m) return { prop: m[1], kind: 'upcoming' };
    m = source.match(/(\w+)\s*<=\s*today\(\)/);
    if (m) return { prop: m[1], kind: 'started' };
    return null;
}

function localDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// "2026-11-02" or "2026-09-23T11:15:00", as that calendar day in the
// visitor's time zone. Date.parse would read a bare date as midnight UTC,
// which is the evening before in the Americas.
function calendarDay(raw: unknown): number | null {
    const m = String(raw ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
}

export function matchesDateFilter(entry: IndexEntry, filter: { prop: string; kind: DateFilter }): boolean {
    const day = calendarDay(entry.fm[filter.prop]);
    const today = localDay(new Date());
    if (filter.kind === 'upcoming') return day === null || day > today;
    return day !== null && day <= today;
}
