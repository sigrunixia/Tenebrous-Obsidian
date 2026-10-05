import { CANVASES } from '../../baked-data';
import { buildEdges } from './edges';
import { buildNode } from './nodes';
import { attachPanZoom } from './pan-zoom';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Lookup key for a canvas, shared with build-index.js: the file's base name,
// lowercased, without the folder or the .canvas extension.
export function canvasKey(name: string): string {
    return (name.trim().split('/').pop() || '').replace(/\.canvas$/i, '').toLowerCase();
}

// ── Canvas codeblock renderer ────────────────────────────────────────────
// Obsidian Publish can't serve or render .canvas files, so build-index.js
// bakes the JSON of every canvas a published note names into CANVASES. A
// fenced ```canvas block holding the canvas's name (the way a ```base block
// holds a query) is replaced here with a read-only pan and zoom view of it.
export function registerCanvas(): void {
    publish.registerMarkdownCodeBlockProcessor('canvas', (source, el) => {
        el.empty();
        const data = CANVASES && CANVASES[canvasKey(source)];
        if (!data || !data.nodes || !data.nodes.length) { el.hide(); return; }

        const nodes = data.nodes;
        const byId = new Map(nodes.map((n) => [n.id, n]));

        const minX = Math.min(...nodes.map((n) => n.x));
        const minY = Math.min(...nodes.map((n) => n.y));
        const maxX = Math.max(...nodes.map((n) => n.x + n.width));
        const maxY = Math.max(...nodes.map((n) => n.y + n.height));
        const bounds = new DOMRect(minX, minY, maxX - minX, maxY - minY);

        const viewport = document.createElement('div');
        viewport.className = 'canvas-embed';
        const stage = document.createElement('div');
        stage.className = 'canvas-embed-stage';

        // Groups sit at the back, then the edges, then the cards on top.
        const groups = nodes.filter((n) => n.type === 'group');
        const cards = nodes.filter((n) => n.type !== 'group');
        groups.forEach((n) => stage.appendChild(buildNode(n)));

        // The SVG has no size of its own; overflow lets edges draw anywhere
        // on the stage, which is positioned at the canvas origin.
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'canvas-embed-edges');
        svg.setAttribute('width', '1');
        svg.setAttribute('height', '1');
        buildEdges(data.edges || [], byId, svg);
        stage.appendChild(svg);

        cards.forEach((n) => stage.appendChild(buildNode(n)));

        viewport.appendChild(stage);
        el.appendChild(viewport);
        attachPanZoom(viewport, stage, bounds);
    });
}
