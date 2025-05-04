import * as vscode from 'vscode';

export function handleTextDocumentChange(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeTextDocument((event) => {
        for (const change of event.contentChanges) {
            const textAdded = change.text;

            const linesAdded = textAdded.split('\n').length - 1;
            const lettersAdded = textAdded.length;

            let totalLinesWritten = context.workspaceState.get('linesWritten', 0);
            let totalLettersWritten = context.workspaceState.get('lettersWritten', 0);

            totalLinesWritten += linesAdded;
            totalLettersWritten += lettersAdded;

            context.workspaceState.update('linesWritten', totalLinesWritten);
            context.workspaceState.update('lettersWritten', totalLettersWritten);

            console.log(`Linhas alteradas: +${linesAdded}, Letras alteradas: +${lettersAdded}`);
        }
    });
}

function countLinesInRange(range: vscode.Range): number {
    return range.end.line - range.start.line;
}