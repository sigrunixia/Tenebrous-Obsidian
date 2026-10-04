import { clusterIconHtml, markerHtml, popupContent } from './markers';
import { BASE_LAYERS, ESRI_ATTRIBUTION, STREET_URL, WORLD_BOUNDS } from './tile-layers';

export function renderBaseMapLeaflet(container: HTMLElement, mapData: MapData): void {
    const map = L.map(container, {
        // Leaflet's defaults snap to whole zoom levels and zoom a full
        // level per scroll tick, which feels like a jump on a trackpad.
        // Quarter-level steps plus a higher wheel-to-zoom ratio make each
        // tick a much smaller, smoother move.
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
    });
    map.fitBounds(WORLD_BOUNDS);

    const streetLayer = L.tileLayer(STREET_URL, { attribution: ESRI_ATTRIBUTION, maxZoom: 20 });

    const layers: Record<string, unknown> = { Street: streetLayer };
    Object.entries(BASE_LAYERS).forEach(([name, { url, attribution, maxZoom }]) => {
        layers[name] = L.tileLayer(url, { attribution, maxZoom });
    });
    streetLayer.addTo(map);
    L.control.layers(layers).addTo(map);

    // Metric only, per house style -- Leaflet's scale control defaults to
    // showing both.
    L.control.scale({ imperial: false, metric: true }).addTo(map);

    const clusters = L.markerClusterGroup({
        maxClusterRadius: 40,
        iconCreateFunction: (cluster: { getChildCount(): number }) => L.divIcon({
            html: clusterIconHtml(cluster.getChildCount()),
            className: '',
            iconSize: [32, 32],
        }),
    });

    mapData.markers.forEach((marker) => {
        const icon = L.divIcon({ html: markerHtml(marker), className: '', iconSize: [26, 26] });
        clusters.addLayer(L.marker([marker.lat, marker.lng], { icon }).bindPopup(popupContent(marker)));
    });
    map.addLayer(clusters);
}
