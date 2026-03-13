import * as vscode from 'vscode';
import { StatsState } from '../../types';
import { closeActiveContext } from '../../utils/closeActiveContext';
import { getLanguage } from '../../utils/data/getLanguage';
import { getProject } from '../../utils/data/getProject';

export function registerEditorTracking(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        const stats = context.workspaceState.get<StatsState>('stats');
        if (!stats) {
            //console.log('editor.change.skipped.noStats');
            return;
        }

        if (!editor || stats.windowState !== 'active') {
            //console.log('editor.change.skipped', {
            // hasEditor: Boolean(editor),
            //     windowState: stats.windowState,
            // });
            context.workspaceState.update('stats', stats);
            return;
        }

        const now = Date.now();
        closeActiveContext(stats, now, 'onDidChangeActiveTextEditor');

        const language = getLanguage(editor.document);
        const projectId = getProject(editor.document);

        stats.activeContext = {
            language,
            projectId,
            since: now
        };

        //console.log('editor.change.activeContext.updated', {
        // language,
        //     projectId,
        //     since: now,
        //         document: editor.document.uri.toString(),
        //         });

        context.workspaceState.update('stats', stats);
    }));
}
