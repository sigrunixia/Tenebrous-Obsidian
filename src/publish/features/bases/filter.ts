import { currentBasename } from '../../lib/current-note';

export interface BaseFilter {
    prop: string;
    target: string;
}

// Supported filter shapes (first match wins):
//   <prop>.contains(this.file.name)              -- self-referencing (hubs)
//   list(<prop>).contains(link("<target>"))       -- standard
//   <prop>.contains(link("<target>"))             -- standard, no list()
export function resolveFilter(source: string): BaseFilter | null {
    let m = source.match(/list\(([^\s.()]+)\)\.contains\(link\("([^"]+)"\)\)/);
    if (m) return { prop: m[1], target: m[2] };
    m = source.match(/([^\s.()]+)\.contains\(link\("([^"]+)"\)\)/);
    if (m) return { prop: m[1], target: m[2] };
    m = source.match(/([^\s.()]+)\.contains\(this\.file\.name\)/);
    if (m) return { prop: m[1], target: currentBasename() };
    return null;
}

// `!file.name.contains("X")` / `!file.fullname.contains("X")` exclusions.
export function exclusions(source: string): string[] {
    const out: string[] = [];
    const re = /!file\.(?:name|fullname)\.contains\("([^"]+)"\)/g;
    let m;
    while ((m = re.exec(source))) out.push(m[1]);
    return out;
}
