// Types for what Obsidian Publish and the CDN-loaded Leaflet add to the page.
// Documentation for the compiler only, nothing here reaches publish.js.

interface PublishSite {
    getInternalUrl(path: string): string;
}

interface PublishApi {
    currentFilepath?: string;
    site?: PublishSite;
    registerMarkdownPostProcessor(fn: (el: HTMLElement) => void): void;
    registerMarkdownCodeBlockProcessor(language: string, fn: (source: string, el: HTMLElement) => void): void;
}

declare const publish: PublishApi;

// Obsidian adds these to every element's prototype.
interface HTMLElement {
    empty(): void;
    hide(): void;
    addClass(...classes: string[]): void;
}

// Leaflet and leaflet.markercluster are loaded from a CDN at runtime.
declare const L: any;
interface Window {
    L?: any;
}

interface IndexEntry {
    path: string;
    basename: string;
    mtime: number;
    permalink: string | null;
    fm: Record<string, any>;
}

interface MapMarker {
    path: string;
    name: string;
    lat: number;
    lng: number;
    icon?: string | null;
    color?: string | null;
}

interface MapData {
    zoom: number;
    center: [number, number];
    markers: MapMarker[];
}

// JSON Canvas 1.0 (jsoncanvas.org/spec/1.0), as baked in from the vault's
// .canvas files. Every field the spec marks optional is optional here.
interface CanvasNode {
    id: string;
    type: 'text' | 'file' | 'link' | 'group';
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    text?: string;
    file?: string;
    subpath?: string;
    url?: string;
    label?: string;
}

interface CanvasEdge {
    id: string;
    fromNode: string;
    toNode: string;
    fromSide?: 'top' | 'right' | 'bottom' | 'left';
    toSide?: 'top' | 'right' | 'bottom' | 'left';
    fromEnd?: 'none' | 'arrow';
    toEnd?: 'none' | 'arrow';
    color?: string;
    label?: string;
}

interface CanvasData {
    nodes?: CanvasNode[];
    edges?: CanvasEdge[];
}
