// Drag to pan, Ctrl or Cmd plus wheel (or a trackpad pinch) to zoom, and
// buttons for the rest. A plain wheel is left alone so the page still scrolls
// past the canvas.
const MIN_SCALE = 0.05;
const MAX_SCALE = 3;

export function attachPanZoom(viewport: HTMLElement, stage: HTMLElement, bounds: DOMRect): void {
    let scale = 1;
    let tx = 0;
    let ty = 0;

    const apply = () => {
        stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };

    const fit = () => {
        const pad = 24;
        const w = viewport.clientWidth;
        const h = viewport.clientHeight;
        if (!w || !h) return;
        scale = Math.min((w - pad * 2) / bounds.width, (h - pad * 2) / bounds.height, 1);
        tx = (w - bounds.width * scale) / 2 - bounds.x * scale;
        ty = (h - bounds.height * scale) / 2 - bounds.y * scale;
        apply();
    };

    const zoomAt = (factor: number, cx: number, cy: number) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
        const k = next / scale;
        tx = cx - (cx - tx) * k;
        ty = cy - (cy - ty) * k;
        scale = next;
        apply();
    };

    const zoomCenter = (factor: number) => zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2);

    viewport.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    let drag: { x: number; y: number } | null = null;
    viewport.addEventListener('pointerdown', (e) => {
        if ((e.target as HTMLElement).closest('a, button')) return;
        drag = { x: e.clientX, y: e.clientY };
        viewport.setPointerCapture(e.pointerId);
        viewport.classList.add('is-dragging');
    });
    viewport.addEventListener('pointermove', (e) => {
        if (!drag) return;
        tx += e.clientX - drag.x;
        ty += e.clientY - drag.y;
        drag = { x: e.clientX, y: e.clientY };
        apply();
    });
    const endDrag = () => { drag = null; viewport.classList.remove('is-dragging'); };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    const controls = document.createElement('div');
    controls.className = 'canvas-embed-controls';
    const button = (label: string, title: string, onClick: () => void) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.title = title;
        b.setAttribute('aria-label', title);
        b.addEventListener('click', onClick);
        controls.appendChild(b);
    };
    button('+', 'Zoom in', () => zoomCenter(1.25));
    button('-', 'Zoom out', () => zoomCenter(0.8));
    button('Fit', 'Fit to view', fit);
    viewport.appendChild(controls);

    // The embed has no size until the page lays it out, so fit once the
    // viewport reports one and again if it is resized.
    new ResizeObserver(fit).observe(viewport);
}
