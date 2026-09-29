(function () {
    'use strict';

    // ── Embedded index ────────────────────────────────────────────────────────
    // At author-time this is null. build-index.js replaces it with real data
    // (baked from every publish: true note's frontmatter) before this file goes
    // to Publish. If you're seeing null in production, run build-index.js and
    // re-upload publish.js.
    const INDEX = null; /* @INDEX */
    const IMG_PATHS = null; /* @IMG_PATHS */

    // Strips [[...]] wikilink syntax and returns just the link target.
    // "[[Τατουάζ|Tattoos]]" -> "Τατουάζ"
    // "Τατουάζ" -> "Τατουάζ"
    function wikilinkTarget(raw) {
        const m = String(raw).match(/\[\[([^\]|]+)/);
        return (m ? m[1] : String(raw)).trim();
    }

    // Frontmatter list fields (τύπος, κατηγορίες, ...) come through as either a
    // single string or an array, depending on how the note wrote it. Normalize.
    function arrayify(v) {
        if (v == null) return [];
        return Array.isArray(v) ? v : [v];
    }

    function currentBasename() {
        const path = publish.currentFilepath || '';
        return (path.split('/').pop() || '').replace(/\.md$/, '');
    }

    // ── Strip internal links that point to unpublished (publish: false) notes ──
    // Obsidian Publish only resolves links between published notes, so a link to
    // an unpublished note already carries `is-unresolved` the same way a broken
    // link would. This turns those into plain text instead of a dead-looking link.
    // The source note itself is never touched.
    //
    // Publish assigns `is-unresolved` to internal links *after* running custom
    // markdown post-processors, in the same synchronous pass (post-processors
    // run, then Publish's own code loops over every a.internal-link and toggles
    // the class). Deferring to a microtask lets that assignment finish first, so
    // the class is actually there by the time we look for it.
    publish.registerMarkdownPostProcessor((el) => {
        queueMicrotask(() => {
            el.querySelectorAll('a.internal-link.is-unresolved').forEach((link) => {
                const span = document.createElement('span');
                span.className = 'unresolved-link-text';
                span.innerHTML = link.innerHTML;
                link.replaceWith(span);
            });
        });
    });

    // ── Bases codeblock renderer ─────────────────────────────────────────────
    // Obsidian Publish doesn't run Bases queries, so a fenced ```base block
    // renders as an empty container. This reimplements the shapes the vault's
    // hub and index pages actually use, reading the codeblock's own YAML
    // source with a handful of targeted regexes rather than a full YAML+Bases-
    // formula parser. It is not a general Bases renderer: anything it doesn't
    // recognize is left hidden (same as Bases' own empty state) rather than
    // rendered wrong. Extend the regexes below as new shapes show up.
    //
    // Supported filter shapes (first match wins):
    //   <prop>.contains(this.file.name)              -- self-referencing (hubs)
    //   list(<prop>).contains(link("<target>"))       -- standard
    //   <prop>.contains(link("<target>"))             -- standard, no list()
    // Supported extras: `!file.name/fullname.contains("X")` exclusions,
    // `image: formula.<Name>` or `image: note.<prop>` covers, `sort:` (one
    // property + direction), `limit:`, `groupBy: formula.<Name>` where that
    // formula is exactly `<prop>.year` (year-bucketing only), and `order:`
    // (first entry is the card title, already covered by the link; the rest
    // render as extra lines below it, labeled from `properties:`'s
    // `displayName` when one is set).
    //
    // Registered as a code block processor rather than intercepting an embed:
    // this runs synchronously as part of Publish's normal post-processor pass,
    // *before* Publish loops over a.internal-link to resolve hrefs and toggle
    // is-unresolved. So the links we create here just need class="internal-link"
    // and data-href set to the target's basename — Publish's own code resolves
    // the href and unresolved state for us, same as it would for a hand-written
    // wikilink.

    function resolveFilter(source) {
        let m = source.match(/list\(([^\s.()]+)\)\.contains\(link\("([^"]+)"\)\)/);
        if (m) return { prop: m[1], target: m[2] };
        m = source.match(/([^\s.()]+)\.contains\(link\("([^"]+)"\)\)/);
        if (m) return { prop: m[1], target: m[2] };
        m = source.match(/([^\s.()]+)\.contains\(this\.file\.name\)/);
        if (m) return { prop: m[1], target: currentBasename() };
        return null;
    }

    function exclusions(source) {
        const out = [];
        const re = /!file\.(?:name|fullname)\.contains\("([^"]+)"\)/g;
        let m;
        while ((m = re.exec(source))) out.push(m[1]);
        return out;
    }

    function parseFormulas(source) {
        const formulas = {};
        const block = source.match(/formulas:\s*\n((?:[ \t]+\S.*\n?)+)/);
        if (!block) return formulas;
        block[1].split('\n').forEach((line) => {
            const m = line.match(/^\s*(\w+):\s*(.+)$/);
            if (m) formulas[m[1]] = m[2].trim();
        });
        return formulas;
    }

    function coverProp(source, formulas) {
        let m = source.match(/image:\s*formula\.(\w+)/);
        if (m) return formulas[m[1]] || null;
        m = source.match(/image:\s*note\.(\S+)/);
        return m ? m[1] : null;
    }

    // Maps a bare property name (e.g. "τροποποίηση", from either "τροποποίηση:"
    // or "note.τροποποίηση:" in the source) to its displayName, e.g. "Last
    // modified". "file.name" is deliberately excluded — that's the card title,
    // handled separately, never rendered as an extra line.
    function parseProperties(source) {
        const map = {};
        const block = source.match(/properties:\s*\n((?:[ \t]+\S.*\n?)+)/);
        if (!block) return map;
        const re = /^[ \t]+(\S+):\s*\n[ \t]+displayName:\s*(.+)$/gm;
        let m;
        while ((m = re.exec(block[1]))) {
            const key = m[1].split('.').pop();
            if (key !== 'name') map[key] = m[2].trim();
        }
        return map;
    }

    // The `order:` list under a view determines which properties show on each
    // card and in what order — first entry is the title (already handled via
    // makeEntryLink), everything after that renders as an extra line.
    function parseOrder(source) {
        const block = source.match(/order:\s*\n((?:[ \t]+-.*\n?)+)/);
        if (!block) return [];
        return block[1]
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.startsWith('- '))
            .map((l) => l.slice(2).trim().split('.').pop())
            .filter((prop) => prop !== 'name');
    }

    // ISO (YYYY-MM-DD), read via the UTC getters rather than toLocaleDateString.
    // A bare date string like "2019-08-30" parses as UTC midnight; reading it
    // back through local-time getters in a negative UTC offset (any US time
    // zone) would print the day before.
    function formatDate(ms) {
        if (!ms || isNaN(ms)) return '';
        const d = new Date(ms);
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${d.getUTCFullYear()}-${mm}-${dd}`;
    }

    // τροποποίηση is special-cased to entry.mtime (already resolved at build
    // time, with the file-mtime fallback build-index.js applies). Any other
    // property reads straight from entry.fm: date-shaped strings get the same
    // formatting, wikilinks get unwrapped, arrays get joined.
    function propDisplayValue(entry, prop) {
        if (prop === 'τροποποίηση') return formatDate(entry.mtime);
        const raw = entry.fm[prop];
        if (raw == null || raw === '') return null;
        if (!Array.isArray(raw) && /^\d{4}-\d{2}-\d{2}/.test(String(raw))) {
            const d = Date.parse(raw);
            if (!isNaN(d)) return formatDate(d);
        }
        return arrayify(raw).map(wikilinkTarget).join(', ');
    }

    function sortSpec(source) {
        const m = source.match(/sort:\s*\n\s*-\s*property:\s*(\S+)\s*\n\s*direction:\s*(ASC|DESC)/);
        return m ? { prop: m[1], dir: m[2] } : null;
    }

    function sortValue(entry, prop) {
        if (prop === 'τροποποίηση') return entry.mtime;
        const v = entry.fm[prop];
        const d = Date.parse(v);
        return isNaN(d) ? (v || '') : d;
    }

    // Only supports the one formula shape actually in use: `<prop>.year`.
    // Anything else falls back to no grouping rather than a wrong grouping.
    function buildGroupFn(source, formulas) {
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

    function makeEntryLink(entry) {
        const a = document.createElement('a');
        a.className = 'internal-link';
        a.textContent = entry.basename;
        a.setAttribute('data-href', entry.basename);
        return a;
    }

    // Exact match first (the common case, a single object property lookup).
    // Falls back to a case-insensitive scan of IMG_PATHS' own keys only when
    // that fails — e.g. a wikilink whose case doesn't exactly match the real
    // filename ("This Is How I Obsidian.png" vs the actual "This is how I
    // obsidian.png"). Scanning is fine here: it only runs on an already-rare
    // mismatch, not on every cover lookup, so it's not worth pre-baking a
    // lowercase duplicate of every entry into the shipped index for.
    function findImagePath(filename) {
        if (!IMG_PATHS) return null;
        if (IMG_PATHS[filename]) return IMG_PATHS[filename];
        const lower = filename.toLowerCase();
        const key = Object.keys(IMG_PATHS).find((k) => k.toLowerCase() === lower);
        return key ? IMG_PATHS[key] : null;
    }

    // Every SVG in Attachments is a flat icon/logo (Lucide, brand marks, ...),
    // never a photo -- so extension is a reliable, no-config way to tell
    // icons from photos and give each its own cover treatment.
    function coverInfo(entry, prop) {
        if (!prop) return null;
        const raw = entry.fm[prop];
        if (!raw) return null;
        const filename = wikilinkTarget(raw).split('/').pop();
        const imgPath = filename ? findImagePath(filename) : null;
        if (!imgPath || !publish.site) return null;
        return { url: publish.site.getInternalUrl(imgPath), isIcon: /\.svg$/i.test(imgPath) };
    }

    function renderCardGrid(el, entries, cover, lineProps, properties) {
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

    function renderCards(el, entries, cover, groupFn, lineProps, properties) {
        el.empty();
        el.addClass('hub-backlink-cards-container');
        if (!groupFn) {
            renderCardGrid(el, entries, cover, lineProps, properties);
            return;
        }
        const groups = new Map();
        for (const entry of entries) {
            const key = groupFn(entry) || '';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(entry);
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

    publish.registerMarkdownCodeBlockProcessor('base', (source, el) => {
        const filter = resolveFilter(source);
        if (!filter || !INDEX) { el.hide(); return; }

        let entries = INDEX.filter((entry) =>
            arrayify(entry.fm[filter.prop]).some((v) => wikilinkTarget(v) === filter.target));

        const excl = exclusions(source);
        if (excl.length) {
            entries = entries.filter((entry) => !excl.some((x) => entry.basename.includes(x)));
        }

        const sort = sortSpec(source);
        entries = entries.slice().sort((a, b) => {
            if (!sort) return b.mtime - a.mtime;
            const av = sortValue(a, sort.prop), bv = sortValue(b, sort.prop);
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sort.dir === 'DESC' ? -cmp : cmp;
        });

        const limitMatch = source.match(/limit:\s*(\d+)/);
        if (limitMatch) entries = entries.slice(0, parseInt(limitMatch[1], 10));

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
}());
