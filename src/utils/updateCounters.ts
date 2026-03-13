import { StatCounters, StatsState, UpdateContext } from "../types";

export function ensureCounters(map: Record<string, StatCounters>, key: string) {
    if (!map[key]) {
        map[key] = { manualAdd: 0, manualDelete: 0, assistedAdd: 0, assistedDelete: 0, bulkAdd: 0, bulkDelete: 0, time: 0 };
    }
}

export function updateCounters(stats: StatsState, ctx: UpdateContext) {
    ensureCounters(stats.byLanguage, ctx.language);
    ensureCounters(stats.byProject, ctx.projectId);

    if (ctx.isBulk) {
        stats.byLanguage[ctx.language].bulkAdd += ctx.addedLines;
        stats.byLanguage[ctx.language].bulkDelete += ctx.removedLines;
        stats.byProject[ctx.projectId].bulkAdd += ctx.addedLines;
        stats.byProject[ctx.projectId].bulkDelete += ctx.removedLines;
        stats.total.bulkAdd += ctx.addedLines;
        stats.total.bulkDelete += ctx.removedLines;
    } else if (ctx.isAssisted) {
        stats.byLanguage[ctx.language].assistedAdd += ctx.addedLines;
        stats.byLanguage[ctx.language].assistedDelete += ctx.removedLines;
        stats.byProject[ctx.projectId].assistedAdd += ctx.addedLines;
        stats.byProject[ctx.projectId].assistedDelete += ctx.removedLines;
        stats.total.assistedAdd += ctx.addedLines;
        stats.total.assistedDelete += ctx.removedLines;
    } else {
        stats.byLanguage[ctx.language].manualAdd += ctx.addedLines;
        stats.byLanguage[ctx.language].manualDelete += ctx.removedLines;
        stats.byProject[ctx.projectId].manualAdd += ctx.addedLines;
        stats.byProject[ctx.projectId].manualDelete += ctx.removedLines;
        stats.total.manualAdd += ctx.addedLines;
        stats.total.manualDelete += ctx.removedLines;
    }
}
