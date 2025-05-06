import * as vscode from 'vscode';

export function handleFileCreation(context: vscode.ExtensionContext, onUpdate?: () => void) {
    vscode.workspace.onDidCreateFiles((e) => {
        let totalFilesCreated = context.workspaceState.get('filesCreated', 0);
        totalFilesCreated += 1;

        context.workspaceState.update('filesCreated', totalFilesCreated);
        if (onUpdate) {
            onUpdate();
        }
    });
}
