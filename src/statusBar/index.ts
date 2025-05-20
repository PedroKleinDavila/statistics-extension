import * as vscode from 'vscode';
import { getUserEmail } from '../utils/getUserEmail';
import { authUser } from '../service/authUser';

export function updateStatsBar(
    extensionContext: vscode.ExtensionContext,
    statsStatusBarItem: vscode.StatusBarItem,
    reconnectStatusBarItem: vscode.StatusBarItem
) {
    if (!extensionContext || !statsStatusBarItem || !reconnectStatusBarItem) { return; }

    const needsLogin = extensionContext.workspaceState.get('needsLogin', false);
    const lines = extensionContext.workspaceState.get('linesWritten', 0);
    const letters = extensionContext.workspaceState.get('lettersWritten', 0);
    const files = extensionContext.workspaceState.get('filesCreated', 0);

    statsStatusBarItem.text = `$(graph) ${lines} lines • ${letters} chars • ${files} files`;
    statsStatusBarItem.command = 'extension.openStatsSite';
    statsStatusBarItem.show();

    if (needsLogin) {
        reconnectStatusBarItem.text = `$(debug-disconnect) Reconnect`;
        reconnectStatusBarItem.tooltip = 'Reconnect to Stats Server';
        reconnectStatusBarItem.command = 'extension.reconnectToStats';
        reconnectStatusBarItem.show();
    } else {
        reconnectStatusBarItem.hide();
    }
}

vscode.commands.registerCommand('extension.openStatsSite', async () => {
    const userEmail = await getUserEmail();

    if (!userEmail) {
        vscode.window.showErrorMessage('User email not found. Please check your settings or login.');
        return;
    }

    const url = `https://coding-statistics-frontend.vercel.app/${userEmail}`;
    vscode.env.openExternal(vscode.Uri.parse(url));
});

vscode.commands.registerCommand('extension.reconnectToStats', async () => {
    vscode.window.showInformationMessage('Reconnecting to Stats Server...');
    const email = await getUserEmail();
    const machineId = vscode.env.machineId;
    if (!email) {
        vscode.window.showErrorMessage('User email not found. Please log in to the extension.');
        return;
    }
    if (!machineId) {
        vscode.window.showErrorMessage('Machine ID not found. Please check your VSCode installation.');
        return;
    }
    const authenticated = await authUser(email, machineId);
    if (authenticated === "User not found") {
        vscode.window.showErrorMessage('User not found. Please check your email or register.');
        vscode.env.openExternal(vscode.Uri.parse(`https://coding-statistics-frontend.vercel.app/${email}/${machineId}`));
        return;
    }
    if (!authenticated) {
        vscode.window.showErrorMessage('Authentication failed. Please check your internet connection.');
        return;
    }
    vscode.window.showInformationMessage('Reconnected to Stats Server successfully!');
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
});
