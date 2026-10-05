import { INDEX } from '../../baked-data';
import { findImagePath } from '../bases/cover-image';
import { canvasColor } from './colors';
import { renderMarkdown } from './markdown-lite';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

function fileBody(node: CanvasNode, body: HTMLElement): void {
    const file = node.file || '';
    const name = file.split('/').pop() || file;

    if (IMAGE_EXT.test(file)) {
        const imgPath = findImagePath(name);
        if (imgPath && publish.site) {
            const img = document.createElement('img');
            img.src = publish.site.getInternalUrl(imgPath);
            img.alt = name;
            img.draggable = false;
            body.appendChild(img);
            return;
        }
    }

    // A note node links only when the note is published; otherwise the title
    // stays plain text, the same as an unresolved link elsewhere on the site.
    const entry = INDEX && INDEX.find((e) => e.path === file);
    const title = name.replace(/\.md$/i, '');
    if (entry) {
        const a = document.createElement('a');
        a.className = 'internal-link';
        a.dataset.href = entry.basename;
        a.href = entry.basename;
        a.textContent = entry.basename;
        body.appendChild(a);
    } else {
        body.textContent = title;
    }
}

function linkBody(node: CanvasNode, body: HTMLElement): void {
    const a = document.createElement('a');
    a.className = 'external-link';
    a.href = node.url || '';
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = node.url || '';
    body.appendChild(a);
}

export function buildNode(node: CanvasNode): HTMLElement {
    const el = document.createElement('div');
    el.className = `canvas-embed-node is-${node.type}`;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${node.width}px`;
    el.style.height = `${node.height}px`;
    const color = canvasColor(node.color);
    if (color) el.style.setProperty('--node-color', color);

    if (node.type === 'group') {
        if (node.label) {
            const label = document.createElement('div');
            label.className = 'canvas-embed-group-label';
            label.textContent = node.label;
            el.appendChild(label);
        }
        return el;
    }

    const body = document.createElement('div');
    body.className = 'canvas-embed-node-body';
    if (node.type === 'text') body.innerHTML = renderMarkdown(node.text || '');
    else if (node.type === 'file') fileBody(node, body);
    else linkBody(node, body);
    el.appendChild(body);
    return el;
}
