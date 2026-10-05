import { INDEX } from '../../baked-data';
import { arrayify, wikilinkTarget } from '../../lib/wikilink';
import { buildGroupFn, coverProp, parseFormulas, parseOrder, parseProperties } from './card-options';
import { renderCards } from './card-grid';
import { dateFilter, matchesDateFilter } from './date-filter';
import { exclusions, resolveFilter } from './filter';
import { renderBaseMapCodeblock } from './map/map-embed';
import { limitSpec, sortEntries, sortSpec } from './sort-limit';

// ── Bases codeblock renderer ─────────────────────────────────────────────
// Obsidian Publish doesn't run Bases queries, so a fenced ```base block
// renders as an empty container. This reimplements the shapes the vault's
// hub and index pages actually use, reading the codeblock's own YAML
// source with a handful of targeted regexes rather than a full YAML+Bases-
// formula parser. It is not a general Bases renderer: anything it doesn't
// recognize is left hidden (same as Bases' own empty state) rather than
// rendered wrong. Extend the regexes as new shapes show up.
//
// Registered as a code block processor rather than intercepting an embed:
// this runs synchronously as part of Publish's normal post-processor pass,
// *before* Publish loops over a.internal-link to resolve hrefs and toggle
// is-unresolved. So the links created here just need class="internal-link"
// and data-href set to the target's basename.
export function registerBases(): void {
    publish.registerMarkdownCodeBlockProcessor('base', (source, el) => {
        if (/type:\s*map/.test(source)) { renderBaseMapCodeblock(source, el); return; }

        const filter = resolveFilter(source);
        if (!filter || !INDEX) { el.hide(); return; }

        let entries = INDEX.filter((entry) =>
            arrayify(entry.fm[filter.prop]).some((v) => wikilinkTarget(v) === filter.target));

        const excl = exclusions(source);
        if (excl.length) {
            entries = entries.filter((entry) => !excl.some((x) => entry.basename.includes(x)));
        }

        const when = dateFilter(source);
        if (when) entries = entries.filter((entry) => matchesDateFilter(entry, when));

        entries = sortEntries(entries, sortSpec(source));

        const limit = limitSpec(source);
        if (limit != null) entries = entries.slice(0, limit);

        if (entries.length === 0) { el.hide(); return; }

        const formulas = parseFormulas(source);
        renderCards(
            el, entries,
            coverProp(source, formulas),
            buildGroupFn(source, formulas),
            parseOrder(source),
            parseProperties(source),
        );
    });
}
