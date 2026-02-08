export function getTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h${minutes % 60}`;
    }
    return `${minutes}m`;
}
