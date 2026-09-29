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
const { execSync } = require('child_process');

const VAULT = path.resolve(process.argv[2] || '/Users/Signia/Vaults/Tenebrous');
const PUBLISH_JS = path.join(__dirname, 'publish.js');

const MARKER = /const INDEX = (?:null|\[[\s\S]*?\]); \/\* @INDEX \*\//;
const IMG_MARKER = /const IMG_PATHS = (?:null|\{[^\n]*\}); \/\* @IMG_PATHS \*\//;

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
    const imgPaths = Object.create(null);
    let skipped = 0;

    walk(VAULT, '', (full, rel, name) => {
        const ext = path.extname(name).toLowerCase();
        if (IMG_EXTS.has(ext)) {
            imgPaths[name] = rel;
            return;
        }
        if (ext !== '.md') return;

        let content;
        try { content = fs.readFileSync(full, 'utf8'); }
        catch { skipped++; return; }

        const fm = parseFrontmatter(content);
        if (fm['publish'] !== true) return;

        const stat = fs.statSync(full);
        index.push({
            path: rel,
            basename: path.basename(name, '.md'),
            mtime: parseDate(fm['modified']) || stat.mtimeMs,
            permalink: fm['permalink'] || null,
            fm,
        });
    });

    let updated = src.replace(MARKER, `const INDEX = ${JSON.stringify(index)}; /* @INDEX */`);
    updated = updated.replace(IMG_MARKER, `const IMG_PATHS = ${JSON.stringify(imgPaths)}; /* @IMG_PATHS */`);
    fs.writeFileSync(PUBLISH_JS, updated);

    const ts = new Date().toLocaleTimeString();
    console.log(`[${ts}] Indexed ${index.length} published notes, ${Object.keys(imgPaths).length} images${skipped ? ` (${skipped} skipped)` : ''} -> publish.js updated`);

    publishCoverImages(index, imgPaths);
}

build();
