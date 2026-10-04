import { MAPS } from '../../../baked-data';
import { loadLeaflet } from './leaflet-loader';
import { renderBaseMapLeaflet } from './render-leaflet';

// A fenced ```base block with `type: map` (see Trips.md's "Χάρτης - Map"
// section) can't run the Bases filter/formula DSL to get coordinates,
// markerIcon and markerColor per row -- so build-index.js already ran that
// exact codeblock's source through `obsidian base:query` (matching desktop's
// own evaluation exactly, rather than reimplementing it) and baked the
// result -- joined back to each note's coordinates, and limited to published
// notes so every marker has somewhere safe to link -- into MAPS, keyed by
// "<note path>#<view name>". This renders it with Leaflet against plain
// tile layers, pulled from a CDN rather than vendored, matching the vault's
// usual "fetch the static asset directly" approach for open-source assets.
//
// MapLibre GL was tried first (matching what the desktop Maps plugin itself
// uses), but its popup CSS gives its close button no reserved space, which
// ran a trip's name straight underneath it with no clean fix short of
// fighting MapLibre's own stylesheet load order. Leaflet is also the lighter
// choice for a handful of static pins (no WebGL, no vector-style pipeline).
export function renderBaseMapCodeblock(source: string, el: HTMLElement): void {
    el.empty();
    if (!MAPS) { el.hide(); return; }

    const nameMatch = source.match(/-\s*type:\s*map\s*\n\s*name:\s*(.+)/);
    const viewName = nameMatch ? nameMatch[1].trim() : 'Map';
    const key = `${publish.currentFilepath || ''}#${viewName}`.toLowerCase();
    const mapData = MAPS[key];
    if (!mapData) { el.hide(); return; }

    const container = document.createElement('div');
    container.className = 'base-map-embed';
    el.appendChild(container);

    loadLeaflet().then(() => renderBaseMapLeaflet(container, mapData)).catch((err) => {
        console.error('[base-map] failed to render', key, err);
        container.remove();
    });
}
