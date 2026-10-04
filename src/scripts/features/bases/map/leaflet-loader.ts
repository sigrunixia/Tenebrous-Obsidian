import { loadScript, loadStylesheet } from '../../../lib/load-assets';

const LEAFLET_VERSION = '1.9.4';
const MARKERCLUSTER_VERSION = '1.5.3';

let leafletLoading: Promise<void> | null = null;

// Leaflet.markercluster groups nearby pins into a numbered badge (see
// Naperville/Chicago on the Trips map, close enough to overlap at low
// zoom) that spiderfies into the individual markers on click -- the
// standard fix for this, and Leaflet has a well-established plugin for
// it rather than needing one written from scratch.
export function loadLeaflet(): Promise<void> {
    if (window.L && window.L.markerClusterGroup) return Promise.resolve();
    if (leafletLoading) return leafletLoading;
    loadStylesheet(`https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`);
    loadStylesheet(`https://cdn.jsdelivr.net/npm/leaflet.markercluster@${MARKERCLUSTER_VERSION}/dist/MarkerCluster.css`);
    loadStylesheet(`https://cdn.jsdelivr.net/npm/leaflet.markercluster@${MARKERCLUSTER_VERSION}/dist/MarkerCluster.Default.css`);
    leafletLoading = loadScript(`https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`)
        .then(() => loadScript(`https://cdn.jsdelivr.net/npm/leaflet.markercluster@${MARKERCLUSTER_VERSION}/dist/leaflet.markercluster.js`));
    return leafletLoading;
}
