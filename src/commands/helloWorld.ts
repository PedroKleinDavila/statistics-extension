import * as vscode from 'vscode';

export function registerHelloWorldCommand() {
    const disposable = vscode.commands.registerCommand('codingstatistics.helloWorld', () => {
        vscode.window.showInformationMessage('Hello test from CodingStatistics!');
    });

    vscode.extensions.onDidChange(() => {
        vscode.commands.executeCommand('codingstatistics.helloWorld');
    });
}
