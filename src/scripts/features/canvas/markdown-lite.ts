// Publish gives a post-processor no way to render a string of Markdown, so
// text nodes go through this small renderer. It covers what canvas cards
// actually hold (headings, lists, bold, italic, code, links, wikilinks) and
// escapes everything else. It is not a general Markdown parser.

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(raw: string): string {
    let s = escapeHtml(raw);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, label?: string) =>
        `<a class="internal-link" data-href="${target}" href="${target}">${label || target}</a>`);
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a class="external-link" href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    return s;
}

export function renderMarkdown(text: string): string {
    const out: string[] = [];
    let list: 'ul' | 'ol' | null = null;
    const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

    for (const line of text.split('\n')) {
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
        const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
        if (heading) {
            closeList();
            out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
        } else if (bullet || numbered) {
            const kind = bullet ? 'ul' : 'ol';
            if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
            out.push(`<li>${inline((bullet || numbered)![1])}</li>`);
        } else if (line.trim()) {
            closeList();
            out.push(`<p>${inline(line)}</p>`);
        } else {
            closeList();
        }
    }
    closeList();
    return out.join('');
}
