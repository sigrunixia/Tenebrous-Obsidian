// ISO (YYYY-MM-DD), read via the UTC getters rather than toLocaleDateString.
// A bare date string like "2019-08-30" parses as UTC midnight; reading it
// back through local-time getters in a negative UTC offset (any US time
// zone) would print the day before.
export function formatDate(ms: number): string {
    if (!ms || isNaN(ms)) return '';
    const d = new Date(ms);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${d.getUTCFullYear()}-${mm}-${dd}`;
}
