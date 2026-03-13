import * as vscode from 'vscode';
import { StatsState } from '../types';
import { getLanguage } from '../utils/data/getLanguage';
import { getProject } from '../utils/data/getProject';

export function initStatsState(context: vscode.ExtensionContext) {
    const activeEditor = vscode.window.activeTextEditor;
    const now = Date.now();
    const initialLanguage = activeEditor ? getLanguage(activeEditor.document) : undefined;
    const initialProjectId = activeEditor ? getProject(activeEditor.document) : undefined;

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
        windowState: vscode.window.state.focused ? 'active' : 'inactive',
        ignoreChanges: false,
        activeContext: {
            language: initialLanguage,
            projectId: initialProjectId,
            since: now,
        },
    };

    context.workspaceState.update('stats', initialStats);
}
