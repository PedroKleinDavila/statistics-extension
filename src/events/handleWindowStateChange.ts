import { StatsState } from "../types";
import * as vscode from 'vscode';
import { closeActiveContext } from "../utils/closeActiveContext";

export function handleWindowStateChange(context: vscode.ExtensionContext) {
    vscode.window.onDidChangeWindowState(e => {
        const stats = context.workspaceState.get<StatsState>('stats');
        if (!stats) return;

        const now = Date.now();

        if (!e.focused) {
            closeActiveContext(stats, now);
            stats.windowState = 'inactive';
        } else {
            stats.windowState = 'active';

            stats.activeContext.since = now;
        }

        context.workspaceState.update('stats', stats);
    });
}
