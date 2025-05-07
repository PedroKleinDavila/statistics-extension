import * as vscode from 'vscode';

export function handleTextDocumentChange(
    context: vscode.ExtensionContext,
    onChange?: () => void
) {
    vscode.workspace.onDidChangeTextDocument((event) => {
        const activeEditor = vscode.window.activeTextEditor;

        if (!activeEditor || event.document !== activeEditor.document) return;

        let totalLinesWritten = context.workspaceState.get('linesWritten', 0);
        let totalLettersWritten = context.workspaceState.get('lettersWritten', 0);

        for (const change of event.contentChanges) {
            const addedText = change.text;
            const removedRange = change.range;
            const removedLength = change.rangeLength;

            if (addedText.length > 0) {
                const addedLines = (addedText.match(/\n/g) || []).length;
                const addedLetters = addedText.length;

                totalLinesWritten += addedLines;
                totalLettersWritten += addedLetters;
            }

            if (removedLength > 0) {
                const removedLines = removedRange.end.line - removedRange.start.line;
                const removedLetters = removedLength;

                totalLinesWritten -= removedLines;
                totalLettersWritten -= removedLetters;
            }
        }

        context.workspaceState.update('linesWritten', totalLinesWritten);
        context.workspaceState.update('lettersWritten', totalLettersWritten);

        if (onChange) {
            onChange();
        }
    });
}
