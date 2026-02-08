import * as vscode from 'vscode';
import { execSync } from 'child_process';

export function getProject(document: vscode.TextDocument): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
        return 'no-workspace';
    }

    const rootPath = workspaceFolder.uri.fsPath;

    const repoName = getRepoNameFromGit(rootPath);
    if (repoName) {
        return repoName;
    }

    const folderName = rootPath.split('/').pop()!;

    return folderName;
}

function getRepoNameFromGit(rootPath: string): string | null {
    try {
        const url = execSync(
            "git config --get remote.origin.url",
            { cwd: rootPath }
        ).toString().trim();

        if (!url) return null;

        return extractRepoName(url);
    } catch {
        return null;
    }
}
function extractRepoName(remoteUrl: string): string {
    const clean = remoteUrl.replace(/\.git$/, '');

    if (clean.includes(':')) {
        return clean.split(':').pop()!.split('/').pop()!;
    }

    return clean.split('/').pop()!;
}
