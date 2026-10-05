import { canvasColor } from './colors';

type Side = 'top' | 'right' | 'bottom' | 'left';
interface Point { x: number; y: number }

const SVG_NS = 'http://www.w3.org/2000/svg';
const ARROW = 12;

const DIRECTION: Record<Side, Point> = {
    top: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    bottom: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
};

function anchor(n: CanvasNode, side: Side): Point {
    switch (side) {
        case 'top': return { x: n.x + n.width / 2, y: n.y };
        case 'bottom': return { x: n.x + n.width / 2, y: n.y + n.height };
        case 'left': return { x: n.x, y: n.y + n.height / 2 };
        default: return { x: n.x + n.width, y: n.y + n.height / 2 };
    }
}

// The spec makes the sides optional. When one is missing, face the other node
// along whichever axis separates the two centers the most.
function guessSide(from: CanvasNode, to: CanvasNode): Side {
    const dx = (to.x + to.width / 2) - (from.x + from.width / 2);
    const dy = (to.y + to.height / 2) - (from.y + from.height / 2);
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'bottom' : 'top';
}

// The tip sits on the node's edge; the arrow points into the node, which is
// opposite the side's outward direction.
function arrowhead(tip: Point, side: Side, color: string): SVGElement {
    const out = DIRECTION[side];
    const perp = { x: -out.y, y: out.x };
    const base = { x: tip.x + out.x * ARROW, y: tip.y + out.y * ARROW };
    const poly = document.createElementNS(SVG_NS, 'polygon');
    poly.setAttribute('points', [
        `${tip.x},${tip.y}`,
        `${base.x + perp.x * ARROW / 2},${base.y + perp.y * ARROW / 2}`,
        `${base.x - perp.x * ARROW / 2},${base.y - perp.y * ARROW / 2}`,
    ].join(' '));
    poly.setAttribute('fill', color);
    return poly;
}

export function buildEdges(edges: CanvasEdge[], nodes: Map<string, CanvasNode>, svg: SVGSVGElement): void {
    for (const edge of edges) {
        const from = nodes.get(edge.fromNode);
        const to = nodes.get(edge.toNode);
        if (!from || !to) continue;

        const fromSide = edge.fromSide || guessSide(from, to);
        const toSide = edge.toSide || guessSide(to, from);
        const a = anchor(from, fromSide);
        const b = anchor(to, toSide);
        const color = canvasColor(edge.color) || 'var(--canvas-color, var(--text-faint))';

        const reach = Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) / 3);
        const c1 = { x: a.x + DIRECTION[fromSide].x * reach, y: a.y + DIRECTION[fromSide].y * reach };
        const c2 = { x: b.x + DIRECTION[toSide].x * reach, y: b.y + DIRECTION[toSide].y * reach };

        // The line stops where the arrowhead's base starts, so it doesn't
        // poke through the tip.
        const start = edge.fromEnd === 'arrow' ? { x: a.x + DIRECTION[fromSide].x * ARROW, y: a.y + DIRECTION[fromSide].y * ARROW } : a;
        const showTo = edge.toEnd !== 'none';
        const end = showTo ? { x: b.x + DIRECTION[toSide].x * ARROW, y: b.y + DIRECTION[toSide].y * ARROW } : b;

        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);

        if (edge.fromEnd === 'arrow') svg.appendChild(arrowhead(a, fromSide, color));
        if (showTo) svg.appendChild(arrowhead(b, toSide, color));

        if (edge.label) {
            const mid = {
                x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
                y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8,
            };
            const text = document.createElementNS(SVG_NS, 'text');
            text.setAttribute('x', String(mid.x));
            text.setAttribute('y', String(mid.y));
            text.setAttribute('class', 'canvas-embed-edge-label');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.textContent = edge.label;
            svg.appendChild(text);
        }
    }
}
