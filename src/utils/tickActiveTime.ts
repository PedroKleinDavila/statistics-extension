import * as vscode from 'vscode';
import { StatsState } from '../types';
import { ensureCounters } from './updateCounters';
export function tickActiveTime(context: vscode.ExtensionContext) {
    const stats = context.workspaceState.get<StatsState>('stats');
    if (!stats) return;

    if (stats.windowState !== 'active') return;

    const now = Date.now();
    const delta = now - stats.activeContext.since;

    stats.total.time += delta;

    if (stats.activeContext.language) {
        ensureCounters(stats.byLanguage, stats.activeContext.language);
        stats.byLanguage[stats.activeContext.language].time += delta;
    }

    if (stats.activeContext.projectId) {
        ensureCounters(stats.byProject, stats.activeContext.projectId);
        stats.byProject[stats.activeContext.projectId].time += delta;
    }

    stats.activeContext.since = now;
    context.workspaceState.update('stats', stats);
}
