import * as vscode from 'vscode';
import { StatsState } from '../../types';
import { closeActiveContext } from '../../utils/closeActiveContext';
import { getLanguage } from '../../utils/data/getLanguage';
import { getProject } from '../../utils/data/getProject';

export function registerEditorTracking(context: vscode.ExtensionContext) {
    vscode.window.onDidChangeActiveTextEditor(editor => {
        const stats = context.workspaceState.get<StatsState>('stats');
        if (!stats) return;
        if (!editor || stats.windowState !== 'active') {
            context.workspaceState.update('stats', stats);
            return;
        }
        const now = Date.now();
        closeActiveContext(stats, now);

        const language = getLanguage(editor.document);
        const projectId = getProject(editor.document);

        stats.activeContext = {
            language,
            projectId,
            since: now
        };

        context.workspaceState.update('stats', stats);
    });
}
