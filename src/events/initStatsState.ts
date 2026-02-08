import * as vscode from 'vscode';
import { StatsState } from '../types';

export function initStatsState(context: vscode.ExtensionContext, document?: vscode.TextDocument) {
    context.workspaceState.get('stats');

    const initialStats: StatsState = {
        byLanguage: {},
        byProject: {},
        total: {
            manualAdd: 0,
            manualDelete: 0,
            assistedAdd: 0,
            assistedDelete: 0,
            bulkAdd: 0,
            bulkDelete: 0,
            time: 0,
        },
        windowState: 'active',
        ignoreChanges: false,
        activeContext: {
            since: Date.now(),
        },
    };

    context.workspaceState.update('stats', initialStats);
}
