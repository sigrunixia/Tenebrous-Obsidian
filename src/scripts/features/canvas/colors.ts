// A JSON Canvas color is either a preset "1" to "6" or a hex string. The
// presets map to the theme's --canvas-color-N variables, so a canvas follows
// the palette the same way it does in the app.
export function canvasColor(color: string | undefined): string | null {
    if (!color) return null;
    return /^[1-6]$/.test(color) ? `var(--canvas-color-${color})` : color;
}
