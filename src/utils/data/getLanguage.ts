import * as vscode from 'vscode';
export function getLanguage(document: vscode.TextDocument): string {
    return document.languageId || 'unknown';
}
