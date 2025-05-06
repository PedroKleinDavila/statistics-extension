import * as vscode from 'vscode';

export function handleFileDeletion(context: vscode.ExtensionContext, onUpdate?: () => void) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidDelete((uri) => {
        console.log(`Arquivo deletado: ${uri.fsPath}`);

        let totalFilesCreated = context.workspaceState.get('filesCreated', 0);

        totalFilesCreated -= 1;

        context.workspaceState.update('filesCreated', totalFilesCreated);
        if (onUpdate) {
            onUpdate();
        }
    });

    context.subscriptions.push(watcher);
}
