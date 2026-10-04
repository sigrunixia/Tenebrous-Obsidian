#!/usr/bin/env node
// build-index.js — walks the Tenebrous vault, collects frontmatter from every
// publish: true note, and bakes it into publish.js as the INDEX the Bases
// codeblock renderer queries against (see publish.js).
//
// Run:   node build-index.js [vault-root]
//   vault-root defaults to /Users/Signia/Vaults/Tenebrous
//
// Rebuild whenever a published note's frontmatter changes in a way that would
// affect a rendered base view (types, categories, cover, permalink, ...), or
// whenever a note's publish flag flips. Nothing else in the vault needs this
// re-run for.
//
// Plain Node, no TypeScript, no npm packages — matches the "no npm, no
// node_modules" rule. Reads publish.js (the marker version, hand-edited),
// injects the index, writes the result to publish.js in this repo. build.sh
// still copies that to the vault root afterward.

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const VAULT = path.resolve(process.argv[2] || '/Users/Signia/Vaults/Tenebrous');
const PUBLISH_JS = path.join(__dirname, 'publish.js');

const MARKER = /const INDEX = (?:null|\[[\s\S]*?\]); \/\* @INDEX \*\//;
const IMG_MARKER = /const IMG_PATHS = (?:null|\{[^\n]*\}); \/\* @IMG_PATHS \*\//;
const MAPS_MARKER = /const MAPS = (?:null|\{[\s\S]*?\}); \/\* @MAPS \*\//;

// Never descend into these, by exact vault-relative path or bare directory
// name. Legends holds credentials — it is never read, not even for
// frontmatter parsing.
const SKIP_PATHS = new Set(['Admin/Legends', 'Admin/Templates']);
const SKIP_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);

const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

// ── Frontmatter parsing ──────────────────────────────────────────────────────
// Handles the shapes Tenebrous frontmatter actually uses: inline scalars
// (`permalink: foo`), quoted strings, booleans, and block sequences
// (`types:\n  - "[[Foo]]"`). Not a general YAML parser.

function parseFrontmatter(content) {
    if (!content.startsWith('---')) return {};
    const end = content.indexOf('\n---', 3);
    if (end === -1) return {};
    return parseYaml(content.slice(3, end).split('\n'));
}

function scalar(s) {
    s = s.trim();
    if (!s) return '';
    if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) {
        return s.slice(1, -1);
    }
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null' || s === '~') return null;
    return s;
}

function indentOf(line) {
    return line.length - line.replace(/^\s+/, '').length;
}

function parseYaml(lines) {
    const result = {};
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed[0] === '#') { i++; continue; }
        const ci = trimmed.indexOf(':');
        if (ci === -1) { i++; continue; }
        const key = trimmed.slice(0, ci).trim();
        const rest = trimmed.slice(ci + 1).trim();
        const parentInd = indentOf(line);
        i++;
        if (rest) {
            result[key] = scalar(rest);
            continue;
        }
        // Block value: collect subsequent more-indented lines.
        const block = [];
        while (i < lines.length) {
            const bl = lines[i];
            if (!bl.trim()) { i++; continue; }
            if (indentOf(bl) <= parentInd) break;
            block.push(bl);
            i++;
        }
        if (block.length && block[0].trim().startsWith('- ')) {
            result[key] = block
                .filter((l) => l.trim().startsWith('- '))
                .map((l) => scalar(l.trim().slice(2)));
        } else if (block.length) {
            result[key] = scalar(block.join(' '));
        } else {
            result[key] = null;
        }
    }
    return result;
}

// ── Vault walkers ────────────────────────────────────────────────────────────

function walk(dir, rel, cb) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
        const entryRel = rel ? rel + '/' + entry.name : entry.name;
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name) || SKIP_PATHS.has(entryRel)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, entryRel, cb);
        } else if (entry.isFile()) {
            cb(full, entryRel, entry.name);
        }
    }
}

// ── Cover image publishing ──────────────────────────────────────────────────
// A note's cover field is only frontmatter metadata, not a real ![[...]]
// embed in the note body — so Obsidian's own publish-dependency scan never
// notices it needs uploading, unlike an image actually embedded in the note.
// Left alone, a cover image 404s on the live site until someone manually
// publish:adds it (this bit us with Obsidian October.png). So: after every
// build, explicitly publish every image any published note's cover points
// at. Idempotent — re-publishing an already-published, unchanged file is a
// harmless no-op — so this runs unconditionally on every build rather than
// trying to diff against what's already live.
//
// Requires the Obsidian app to be running (same as any `obsidian` CLI call).
// A failure here (app not open) is logged but doesn't fail the build — the
// index/publish.js write already succeeded by this point.

function wikilinkTarget(raw) {
    const m = String(raw).match(/\[\[([^\]|]+)/);
    return (m ? m[1] : String(raw)).trim();
}

// ── Referenced images only ───────────────────────────────────────────────────
// IMG_PATHS only needs to cover images a published note can actually show --
// its own cover, or something embedded in its body. Earlier this baked in
// every image in the whole vault (962 of them, ~80KB of publish.js) since it
// never had to answer "referenced by what", which the cards/map renderers
// never needed. Collecting just the referenced filenames here cuts that to
// whatever the ~25 published notes actually use.
const IMG_EMBED_RE = /!\[\[([^\]|]+\.(?:png|jpe?g|gif|webp|svg))(?:\|[^\]]*)?\]\]/gi;
const MD_IMG_RE = /!\[[^\]]*\]\(([^)\s]+\.(?:png|jpe?g|gif|webp|svg))\)/gi;

function referencedImageNames(fm, content) {
    const names = new Set();
    if (fm['cover']) {
        const name = wikilinkTarget(fm['cover']).split('/').pop();
        if (name) names.add(name);
    }
    let m;
    IMG_EMBED_RE.lastIndex = 0;
    while ((m = IMG_EMBED_RE.exec(content))) names.add(m[1].split('/').pop());
    MD_IMG_RE.lastIndex = 0;
    while ((m = MD_IMG_RE.exec(content))) {
        try { names.add(decodeURIComponent(m[1]).split('/').pop()); }
        catch { names.add(m[1].split('/').pop()); }
    }
    return names;
}

function publishAsset(relPath) {
    try {
        execSync(`obsidian publish:add vault="Tenebrous" file="${relPath.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function publishCoverImages(index, imgPaths) {
    const paths = new Set();
    for (const entry of index) {
        const raw = entry.fm['cover'];
        if (!raw) continue;
        const filename = wikilinkTarget(raw).split('/').pop();
        const imgPath = filename && imgPaths[filename];
        if (imgPath) paths.add(imgPath);
    }
    if (!paths.size) return;
    console.log(`Publishing ${paths.size} cover image(s) referenced by cover...`);
    for (const p of paths) {
        console.log(`  ${publishAsset(p) ? 'published' : 'FAILED (is Obsidian running?)'}: ${p}`);
    }
}

// ── Bases map views ──────────────────────────────────────────────────────────
// Obsidian Publish can't run a Bases map view, fenced ```base codeblock or
// not — but unlike a `![[File.base#View]]` file embed (which Publish leaves
// as literal, unhandled text), a fenced ```base block *does* reach a
// registered markdown codeblock processor, the same way the existing
// cards-rendering one in publish.js already does. So a published note's Map
// view is written as a self-contained inline codeblock (see Trips.md), not a
// reference to Admin/Bases/Trips.base, and publish.js's codeblock processor
// special-cases `type: map` to render it. This script's job is just to get
// that view's data: rather than reimplementing the Bases filter/formula DSL
// a second time, each map codeblock's exact source gets written to a scratch
// .base file and run through `obsidian base:query` (the CLI already
// evaluates filters and formulas exactly as the desktop app would), then
// joined against Obsidian's live frontmatter cache to pick up coordinates
// and publish state. Requires the Obsidian app open, same as
// publishCoverImages — logged and skipped, not fatal, if it isn't.

const MAP_CODEBLOCK_RE = /```base\n([\s\S]*?)```/g;
// Obsidian's vault index ignores dotfiles outright (same as .obsidian,
// .trash), so a leading-dot scratch filename would be invisible to it --
// base:query would 404 on it no matter how long this script waited. And each
// call gets its own filename rather than reusing one: deleting and
// recreating the same path back to back left Obsidian's cache briefly
// answering with the *previous* call's view list, failing the next query
// with "View not found" even though the file on disk was already correct.
let scratchCounter = 0;
function nextScratchBase() {
    scratchCounter += 1;
    return `zz-build-scratch-${scratchCounter}.base`;
}

// One map codeblock per note is the only shape in use — if that ever
// changes, the second one just won't get a distinct key and will overwrite
// the first in MAPS, same failure mode as a duplicate `name:` inside a real
// .base file's views list.
function findMapCodeblocks(index) {
    const found = [];
    for (const entry of index) {
        const full = path.join(VAULT, entry.path);
        let content;
        try { content = fs.readFileSync(full, 'utf8'); }
        catch { continue; }
        let m;
        MAP_CODEBLOCK_RE.lastIndex = 0;
        while ((m = MAP_CODEBLOCK_RE.exec(content))) {
            const block = m[1];
            if (!/type:\s*map/.test(block)) continue;
            const nameMatch = block.match(/-\s*type:\s*map\s*\n\s*name:\s*(.+)/);
            const viewName = nameMatch ? nameMatch[1].trim() : 'Map';
            found.push({ notePath: entry.path, viewName, source: block });
        }
    }
    return found;
}

// Pulls defaultZoom and center straight out of the codeblock's own source —
// a small scoped regex rather than a general parser, since these are always
// flat scalars under the map view's own block.
function viewMapSettings(source) {
    const zoom = source.match(/defaultZoom:\s*([\d.]+)/);
    const center = source.match(/center:\s*"?\[?\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]?"?/);
    return {
        zoom: zoom ? parseFloat(zoom[1]) : null,
        center: center ? [parseFloat(center[1]), parseFloat(center[2])] : null,
    };
}

// Writes the codeblock's exact source as a standalone .base file so
// `obsidian base:query` can evaluate it — it only reads named .base files,
// not an inline note codeblock — then removes the scratch file again.
function queryMapCodeblock(source, viewName) {
    const scratchName = nextScratchBase();
    const scratchPath = path.join(VAULT, 'Admin/Bases', scratchName);
    const scratchRel = `Admin/Bases/${scratchName}`;
    fs.writeFileSync(scratchPath, source);
    try {
        // Obsidian's file watcher needs a beat to notice the new file before
        // base:query can find it -- without this it 404s on the very first
        // write, every time.
        for (let i = 0; i < 10; i++) {
            const seen = execFileSync(
                'obsidian',
                ['eval', 'vault=Tenebrous', `code=!!app.vault.getAbstractFileByPath("${scratchRel}")`],
                { stdio: ['ignore', 'pipe', 'pipe'] },
            ).toString('utf8');
            if (seen.includes('true')) break;
            execSync('sleep 0.3');
        }

        const escapedView = String(viewName).replace(/"/g, '\\"');
        const out = execSync(
            `obsidian base:query vault="Tenebrous" path="${scratchRel}" view="${escapedView}" format=json`,
            { stdio: ['ignore', 'pipe', 'pipe'] },
        );
        return JSON.parse(out.toString('utf8'));
    } finally {
        try { fs.unlinkSync(scratchPath); } catch { /* already gone */ }
    }
}

// Reads coordinates/publish/permalink straight from Obsidian's own live
// metadataCache via `obsidian eval`, rather than joining base:query's row
// paths against this script's own fs-walked index. Both base:query and a
// separate fs walk are each internally consistent, but *between* the two --
// one going through Obsidian's Bases engine, the other reading disk directly
// -- a rename mid-build can leave them disagreeing on a path for a moment.
// Keeping the whole join inside Obsidian's own view of the vault avoids that:
// whatever base:query just said the path was, this asks Obsidian the same
// instant what it thinks lives there, and drives everything off that answer.
function fetchLiveFrontmatter(paths) {
    if (!paths.length) return new Map();
    const code = `JSON.stringify(${JSON.stringify(paths)}.map(p => {
        const f = app.vault.getAbstractFileByPath(p);
        const fm = f ? (app.metadataCache.getFileCache(f) || {}).frontmatter : null;
        return {
            path: p,
            basename: f ? f.basename : null,
            coordinates: (fm && fm.coordinates) || null,
            publish: !!(fm && fm.publish === true),
            permalink: (fm && fm.permalink) || null,
        };
    }))`;
    const out = execFileSync('obsidian', ['eval', 'vault=Tenebrous', 'code=' + code], { stdio: ['ignore', 'pipe', 'pipe'] });
    const text = out.toString('utf8').replace(/^=>\s*/, '');
    const rows = JSON.parse(text);
    return new Map(rows.map((r) => [r.path, r]));
}

function buildMaps(index) {
    const codeblocks = findMapCodeblocks(index);
    if (!codeblocks.length) return null;

    const maps = {};

    for (const { notePath, viewName, source } of codeblocks) {
        const label = `${notePath}#${viewName}`;
        const key = label.toLowerCase();

        // base:query occasionally answers from a Bases cache that hasn't
        // settled yet (seen returning paths that don't match the vault's own
        // getMarkdownFiles() a moment before or after) -- a few retries with
        // a short pause clears it. Keep the attempt with the most markers
        // rather than just the last one, in case a later attempt regresses.
        let best = null;
        for (let attempt = 1; attempt <= 4; attempt++) {
            let rows;
            try {
                rows = queryMapCodeblock(source, viewName);
            } catch (err) {
                console.warn(`  base:query FAILED for ${label} (is Obsidian running?): ${err.message.split('\n')[0]}`);
                break;
            }

            let fmByPath;
            try {
                fmByPath = fetchLiveFrontmatter(rows.map((r) => r.path));
            } catch (err) {
                console.warn(`  live frontmatter fetch FAILED for ${label}: ${err.message.split('\n')[0]}`);
                break;
            }

            const markers = [];
            for (const row of rows) {
                const live = fmByPath.get(row.path);
                if (!live || !live.publish) continue; // not a published note — no safe link, skip
                const coords = live.coordinates;
                if (!Array.isArray(coords) || coords.length !== 2) continue;
                const lat = parseFloat(coords[0]);
                const lng = parseFloat(coords[1]);
                if (isNaN(lat) || isNaN(lng)) continue;
                markers.push({
                    path: row.path,
                    name: live.basename,
                    lat, lng,
                    icon: row.Icon || null,
                    color: row.Color || null,
                });
            }

            if (!best || markers.length > best.markers.length) best = { rows, markers };
            if (markers.length > 0 || rows.length === 0) break;
            if (attempt < 4) {
                console.warn(`  ${label}: attempt ${attempt} got 0/${rows.length} — retrying (base:query cache may not have settled)`);
                execSync('sleep 1.5');
            }
        }
        if (!best) continue;
        const { rows, markers } = best;

        const settings = viewMapSettings(source);
        maps[key] = { zoom: settings.zoom, center: settings.center, markers };
        console.log(`  ${label}: ${markers.length}/${rows.length} rows have coordinates + are published`);
    }

    return maps;
}

// ── Build ─────────────────────────────────────────────────────────────────────

function parseDate(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.getTime();
}

function build() {
    if (!fs.existsSync(PUBLISH_JS)) {
        console.error('publish.js not found at', PUBLISH_JS);
        process.exit(1);
    }
    const src = fs.readFileSync(PUBLISH_JS, 'utf8');
    if (!MARKER.test(src)) {
        console.error('Marker "@INDEX" not found in publish.js — was it manually removed?');
        process.exit(1);
    }

    const index = [];
    const allImgPaths = Object.create(null); // every image in the vault, by filename -- resolution source only, never emitted
    const referencedNames = new Set();
    let skipped = 0;

    walk(VAULT, '', (full, rel, name) => {
        const ext = path.extname(name).toLowerCase();
        if (IMG_EXTS.has(ext)) {
            allImgPaths[name] = rel;
            return;
        }
        if (ext !== '.md') return;

        let content;
        try { content = fs.readFileSync(full, 'utf8'); }
        catch { skipped++; return; }

        const fm = parseFrontmatter(content);
        if (fm['publish'] !== true) return;

        referencedImageNames(fm, content).forEach((n) => referencedNames.add(n));

        const stat = fs.statSync(full);
        index.push({
            path: rel,
            basename: path.basename(name, '.md'),
            mtime: parseDate(fm['modified']) || stat.mtimeMs,
            permalink: fm['permalink'] || null,
            fm,
        });
    });

    // Same exact-then-case-insensitive match publish.js's own findImagePath
    // does at runtime (for a wikilink whose case doesn't match the real
    // filename) -- done once here instead, so the shipped map only ever
    // needs a plain lookup.
    const imgPaths = Object.create(null);
    referencedNames.forEach((name) => {
        if (allImgPaths[name]) { imgPaths[name] = allImgPaths[name]; return; }
        const lower = name.toLowerCase();
        const key = Object.keys(allImgPaths).find((k) => k.toLowerCase() === lower);
        if (key) imgPaths[key] = allImgPaths[key];
    });

    console.log('Resolving base map embeds...');
    const maps = buildMaps(index);

    let updated = src.replace(MARKER, `const INDEX = ${JSON.stringify(index)}; /* @INDEX */`);
    updated = updated.replace(IMG_MARKER, `const IMG_PATHS = ${JSON.stringify(imgPaths)}; /* @IMG_PATHS */`);
    updated = updated.replace(MAPS_MARKER, `const MAPS = ${JSON.stringify(maps)}; /* @MAPS */`);
    fs.writeFileSync(PUBLISH_JS, updated);

    const ts = new Date().toLocaleTimeString();
    console.log(`[${ts}] Indexed ${index.length} published notes, ${Object.keys(imgPaths).length} images${skipped ? ` (${skipped} skipped)` : ''} -> publish.js updated`);

    publishCoverImages(index, imgPaths);
}

build();
