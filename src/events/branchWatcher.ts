import * as vscode from 'vscode';
import { putStats } from '../service/putStats';

let lastBranchName: string | undefined;

export async function startGitBranchWatcher(context: vscode.ExtensionContext, onChange?: () => void) {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    const api = gitExtension?.getAPI(1);

    if (!api || api.repositories.length === 0) {
        console.warn('Git API not available or no repositories found.');
        return;
    }

    const repo = api.repositories[0];
    lastBranchName = repo.state.HEAD?.name;

    repo.state.onDidChange(async () => {
        const currentBranch = repo.state.HEAD?.name;
        if (!currentBranch || currentBranch === lastBranchName) { return; }

        lastBranchName = currentBranch;

        const email = context.workspaceState.get('userEmail', null);
        const lines = context.workspaceState.get('linesWritten', 0);
        const letters = context.workspaceState.get('lettersWritten', 0);
        const files = context.workspaceState.get('filesCreated', 0);
        let totalTime = context.workspaceState.get('totalTime', 0);
        const startTime = context.workspaceState.get('startTime', null);

        if (startTime !== null) {
            const sessionTime = Date.now() - startTime;
            totalTime += sessionTime;
            context.workspaceState.update('totalTime', totalTime);
        }

        if (email) {
            await putStats(email, lines, letters, Math.floor(totalTime / 1000), files);
            context.workspaceState.update('linesWritten', 0);
            context.workspaceState.update('lettersWritten', 0);
            context.workspaceState.update('filesCreated', 0);
            context.workspaceState.update('startTime', Date.now());
            context.workspaceState.update('totalTime', 0);
            if (onChange) {
                onChange();
            }
        }
    });
}
