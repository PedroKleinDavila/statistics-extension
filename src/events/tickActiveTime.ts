import * as vscode from 'vscode';
import { StatsState } from '../types';
import { ensureCounters } from '../utils/updateCounters';
export function tickActiveTime(context: vscode.ExtensionContext) {
    const stats = context.workspaceState.get<StatsState>('stats');
    if (!stats) {
        //console.log('tickActiveTime.skipped.noStats');
        return;
    }

    if (stats.windowState !== 'active') {
        //console.log('tickActiveTime.skipped.windowInactive', {
        // windowState: stats.windowState,
        // });
        return;
    }

    const now = Date.now();
    const delta = Math.max(0, now - stats.activeContext.since);

    //console.log('tickActiveTime.run', {
    // deltaMs: delta,
    //     language: stats.activeContext.language ?? null,
    //         projectId: stats.activeContext.projectId ?? null,
    //             since: stats.activeContext.since,
    //                 now,
    //     });

    stats.total.time += delta;

    if (stats.activeContext.language) {
        ensureCounters(stats.byLanguage, stats.activeContext.language);
        stats.byLanguage[stats.activeContext.language].time += delta;
    }

    if (stats.activeContext.projectId) {
        ensureCounters(stats.byProject, stats.activeContext.projectId);
        stats.byProject[stats.activeContext.projectId].time += delta;
    }

    if (!stats.activeContext.language || !stats.activeContext.projectId) {
        //console.log('tickActiveTime.context.missingDimension', {
        // hasLanguage: Boolean(stats.activeContext.language),
        //     hasProjectId: Boolean(stats.activeContext.projectId),
        //         deltaMs: delta,
        // });
    }

    stats.activeContext.since = now;
    context.workspaceState.update('stats', stats);
}
