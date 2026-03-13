import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

export function getProject(document: vscode.TextDocument): string {
    const start = Date.now();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
        //console.log('project.resolve.noWorkspace', {
        // document: document.uri.toString(),
        //     elapsedMs: Date.now() - start,
        // });
        return '';
    }

    const rootPath = workspaceFolder.uri.fsPath;

    const repoName = getRepoNameFromGit(rootPath);
    if (repoName) {
        const elapsed = Date.now() - start;
        if (elapsed > 50) {
            //console.log('project.resolve.gitRepo.slow', {
            // rootPath,
            //     projectId: repoName,
            //         elapsedMs: elapsed,
            //     });
        }
        return repoName;
    }

    return '';
}

function getRepoNameFromGit(rootPath: string): string | null {
    const repoNameAtRoot = getRepoNameFromSinglePath(rootPath);
    if (repoNameAtRoot) {
        return repoNameAtRoot;
    }

    const firstLevelPaths = getFirstLevelDirectories(rootPath);
    for (const childPath of firstLevelPaths) {
        const repoNameAtChild = getRepoNameFromSinglePath(childPath);
        if (repoNameAtChild) {
            return repoNameAtChild;
        }
    }

    return null;
}

function getRepoNameFromSinglePath(pathToCheck: string): string | null {
    try {
        const url = execSync(
            "git config --get remote.origin.url",
            { cwd: pathToCheck }
        ).toString().trim();

        if (!url) return null;

        return extractRepoName(url);
    } catch {
        return null;
    }
}

function getFirstLevelDirectories(rootPath: string): string[] {
    try {
        return readdirSync(rootPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => join(rootPath, entry.name));
    } catch {
        return [];
    }
}

function extractRepoName(remoteUrl: string): string {
    const clean = remoteUrl.replace(/\.git$/, '');

    if (clean.includes(':')) {
        return clean.split(':').pop()!.split('/').pop()!;
    }

    return clean.split('/').pop()!;
}
