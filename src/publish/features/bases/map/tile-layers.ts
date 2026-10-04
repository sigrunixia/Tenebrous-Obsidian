const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// CARTO's free basemaps (light_all/dark_all) now require an API key --
// Esri's Gray Canvas dark variant is the same minimalist style, keyless,
// and the same arcgisonline.com server the Satellite layer below already
// uses without one. Always dark, not theme-aware: _publish.scss forces
// the whole site dark regardless of visitor theme choice (the toggle is
// hidden), so there's no "light" state for this to ever match.
export const ESRI_ATTRIBUTION = '&copy; <a href="https://www.esri.com/">Esri</a>';
export const STREET_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

// Satellite and topographic are free, keyless base layers worth having
// alongside Street -- genuinely useful for an actual trip (what did this
// place look like, what's the terrain), not just reskins.
export const BASE_LAYERS: Record<string, { url: string; attribution: string; maxZoom: number }> = {
    Satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: 19,
    },
    Topographic: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: `${OSM_ATTRIBUTION}, <a href="https://opentopomap.org/">OpenTopoMap</a> (CC-BY-SA)`,
        maxZoom: 17,
    },
};

// All seven populated continents, Antarctica deliberately excluded --
// used as the default framing regardless of where the current markers
// are, so the map reads as "the whole world, some places visited" rather
// than zooming to whatever the current handful of trips happen to cover.
export const WORLD_BOUNDS: [[number, number], [number, number]] = [[-56, -170], [78, 180]];
