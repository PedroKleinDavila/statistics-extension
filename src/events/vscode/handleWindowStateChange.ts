import { StatsState } from "../../types";
import * as vscode from 'vscode';
import { closeActiveContext } from "../../utils/closeActiveContext";
import { getLanguage } from '../../utils/data/getLanguage';
import { getProject } from '../../utils/data/getProject';

export function handleWindowStateChange(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.window.onDidChangeWindowState(e => {
        const stats = context.workspaceState.get<StatsState>('stats');
        if (!stats) {
            //console.log('window.stateChange.skipped.noStats');
            return;
        }

        const now = Date.now();
        const previousState = stats.windowState;

        if (!e.focused) {
            closeActiveContext(stats, now, 'onDidChangeWindowState.blur');
            stats.windowState = 'inactive';
        } else {
            stats.windowState = 'active';
            const editor = vscode.window.activeTextEditor;
            const language = editor ? getLanguage(editor.document) : undefined;
            const projectId = editor ? getProject(editor.document) : undefined;

            stats.activeContext = {
                language,
                projectId,
                since: now,
            };
        }

        //console.log('window.stateChange', {
        // focused: e.focused,
        //     previousState,
        //     nextState: stats.windowState,
        //         activeContextLanguage: stats.activeContext.language ?? null,
        //             activeContextProjectId: stats.activeContext.projectId ?? null,
        //                 activeContextSince: stats.activeContext.since,
        // });

        context.workspaceState.update('stats', stats);
    }));
}
