import { StatsState } from "../types";
import { ensureCounters } from "./updateCounters";

export function closeActiveContext(stats: StatsState, now: number) {
    if (stats.windowState !== 'active') return;

    const { language, projectId, since } = stats.activeContext;
    if (!language && !projectId) {
        return;
    }
    const delta = now - since;

    stats.total.time += delta;
    if (language) {
        ensureCounters(stats.byLanguage, language);
        stats.byLanguage[language].time += delta;
    }
    if (projectId) {
        ensureCounters(stats.byProject, projectId);
        stats.byProject[projectId].time += delta;
    }

    stats.activeContext = {
        since: now,
    };
}
