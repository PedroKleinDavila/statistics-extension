export function formatLines(lines: number): string {
    if (lines >= 1000) {
        return `${(lines / 1000).toFixed(1)}k`;
    }
    return `${lines}`;
}