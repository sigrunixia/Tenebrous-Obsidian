// Same colored-circle-with-count look as a single marker's dot, sized up
// a little with the count centered in it, rather than markercluster's
// default green/yellow/orange size-graded circles.
export function clusterIconHtml(count: number): string {
    return `<div class="base-map-cluster">${count}</div>`;
}

// A colored dot (the note's location `color`) with the location's Lucide
// `icon` masked on top in white, as an HTML string rather than a DOM node
// since L.divIcon only takes markup.
export function markerHtml(marker: MapMarker): string {
    const color = marker.color || 'var(--interactive-accent)';
    const iconUrl = marker.icon ? `https://cdn.jsdelivr.net/npm/lucide-static/icons/${marker.icon}.svg` : null;
    const iconHtml = iconUrl
        ? `<div class="base-map-marker-icon" style="-webkit-mask-image:url(${iconUrl});mask-image:url(${iconUrl})"></div>`
        : '';
    const name = marker.name.replace(/"/g, '&quot;');
    return `<div class="base-map-marker" style="background-color:${color}" aria-label="${name}">${iconHtml}</div>`;
}

// An internal-link with data-href lets Publish's own router resolve it
// correctly, same as any ordinary wikilink. (getInternalUrl, used for cover
// images, resolves to the raw asset URL, not the note's permalink page.)
export function popupContent(marker: MapMarker): HTMLAnchorElement {
    const a = document.createElement('a');
    a.className = 'internal-link';
    a.textContent = marker.name;
    a.setAttribute('data-href', marker.name);
    return a;
}
