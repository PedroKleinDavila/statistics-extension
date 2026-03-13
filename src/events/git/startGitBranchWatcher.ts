import * as vscode from 'vscode';
import { StatsState } from '../../types';
export async function startGitBranchWatcher(context: vscode.ExtensionContext) {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    const api = gitExtension?.getAPI(1);
    if (!api || api.repositories.length === 0) return;

    const repo = api.repositories[0];
    let lastBranch = repo.state.HEAD?.name;

    repo.state.onDidChange(() => {
        const current = repo.state.HEAD?.name;
        if (!current || current === lastBranch) return;

        lastBranch = current;

        const existing = context.workspaceState.get<StatsState>('stats');
        if (!existing) return;
        existing.ignoreChanges = true;
        context.workspaceState.update('stats', existing);
    });
}
