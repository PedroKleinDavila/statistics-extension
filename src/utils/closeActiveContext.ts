import { StatsState } from "../types";
import { ensureCounters } from "./updateCounters";

export function closeActiveContext(stats: StatsState, now: number, source = 'unknown') {
    if (stats.windowState !== 'active') {
        //console.log('activeContext.close.skipped.windowInactive', {
        // source,
        //     windowState: stats.windowState,
        // });
        return;
    }

    const { language, projectId, since } = stats.activeContext;
    if (!language && !projectId) {
        //console.log('activeContext.close.skipped.emptyContext', {
        // source,
        //     since,
        //     now,
        //     });
        return;
    }

    const delta = Math.max(0, now - since);

    stats.total.time += delta;
    if (language) {
        ensureCounters(stats.byLanguage, language);
        stats.byLanguage[language].time += delta;
    }
    if (projectId) {
        ensureCounters(stats.byProject, projectId);
        stats.byProject[projectId].time += delta;
    }

    //console.log('activeContext.close.applied', {
    // source,
    //     language: language ?? null,
    //         projectId: projectId ?? null,
    //             deltaMs: delta,
    // });

    stats.activeContext = {
        since: now,
    };
}
