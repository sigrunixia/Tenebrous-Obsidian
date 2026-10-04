export function currentBasename(): string {
    const path = publish.currentFilepath || '';
    return (path.split('/').pop() || '').replace(/\.md$/, '');
}
