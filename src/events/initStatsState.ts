import * as vscode from 'vscode';
import { StatsState } from '../types';
import { getLanguage } from '../utils/data/getLanguage';
import { getProject } from '../utils/data/getProject';

export function initStatsState(context: vscode.ExtensionContext) {
    context.workspaceState.get('stats');

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
    //console.log('stats.init', {
    // hasActiveEditorAtStartup: Boolean(activeEditor),
    //     activeEditorDocument: activeEditor?.document.uri.toString() ?? null,
    //         activeEditorLanguage: activeEditor?.document.languageId ?? null,
    //             activeEditorProject: initialProjectId ?? null,
    //                 initialWindowState: initialStats.windowState,
    // });
}
