import * as vscode from 'vscode';
import { handleFileCreation } from './events/onFileCreation';
import { handleTextDocumentChange } from './events/onTextChange';
import { handleWindowStateChange } from './events/onWindowChange';
import { getUserEmail } from './utils/getUserEmail';
import { putStats } from './service/putStats';
import { startGitBranchWatcher } from './events/branchWatcher';
import { authUser } from './service/authUser';
import { updateStatsBar } from './statusBar';
let extensionContext: vscode.ExtensionContext;
let statsStatusBarItem: vscode.StatusBarItem;
let reconnectStatusBarItem: vscode.StatusBarItem;
export async function activate(context: vscode.ExtensionContext) {
	extensionContext = context;
	const email = await getUserEmail();
	const machineId = vscode.env.machineId;
	if (!email) {
		vscode.window.showErrorMessage('User email not found. Please log in to the extension.');
		context.workspaceState.update('userEmail', null);
		return;
	}
	if (!machineId) {
		vscode.window.showErrorMessage('Machine ID not found. Please check your VSCode installation.');
		context.workspaceState.update('userEmail', null);
		return;
	}
	const authenticated = await authUser(email, machineId);
	context.workspaceState.update('needsLogin', false);
	if (authenticated === "User not found") {
		vscode.window.showErrorMessage('User not found. Please check your email or register.');
		context.workspaceState.update('needsLogin', true);
		context.workspaceState.update('userEmail', null);
		vscode.env.openExternal(vscode.Uri.parse(`https://coding-statistics-frontend.vercel.app/${email}/${machineId}`));
	}
	if (!authenticated) {
		vscode.window.showErrorMessage('Authentication failed. Please check your internet connection.');
		context.workspaceState.update('needsLogin', true);
		context.workspaceState.update('userEmail', null);
	}
	context.workspaceState.update('userEmail', email);
	context.workspaceState.update('machineId', machineId);
	context.workspaceState.update('linesWritten', 0);
	context.workspaceState.update('lettersWritten', 0);
	context.workspaceState.update('totalTime', 0);
	context.workspaceState.update('filesCreated', 0);
	context.workspaceState.update('windowState', 'active');
	context.workspaceState.update('startTime', Date.now());

	statsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statsStatusBarItem.tooltip = 'Coding Statistics';
	statsStatusBarItem.show();

	reconnectStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);

	context.subscriptions.push(statsStatusBarItem, reconnectStatusBarItem);
	updateStatsBar(extensionContext, statsStatusBarItem, reconnectStatusBarItem);

	startGitBranchWatcher(context, () => updateStatsBar(extensionContext, statsStatusBarItem, reconnectStatusBarItem));
	handleTextDocumentChange(context, () => updateStatsBar(extensionContext, statsStatusBarItem, reconnectStatusBarItem));
	handleFileCreation(context, () => updateStatsBar(extensionContext, statsStatusBarItem, reconnectStatusBarItem));
	handleWindowStateChange(context);
}

export async function deactivate() {
	const email = extensionContext.workspaceState.get('userEmail', null);
	if (email) {
		console.log(`Logged in user: ${email}`);
	} else {
		console.log('User not authenticated or email unavailable');
		return;
	}
	if (!extensionContext) {
		console.error('Extension context is not available.');
		return;
	}
	const linesWritten = extensionContext.workspaceState.get('linesWritten', 0);
	const lettersWritten = extensionContext.workspaceState.get('lettersWritten', 0);
	const filesCreated = extensionContext.workspaceState.get('filesCreated', 0);
	let totalTime = extensionContext.workspaceState.get('totalTime', 0);
	const startTime = extensionContext.workspaceState.get('startTime', null);
	const machineId = extensionContext.workspaceState.get('machineId', null) ?? "";

	if (startTime !== null) {
		const sessionTime = Date.now() - startTime;
		totalTime += sessionTime;
		extensionContext.workspaceState.update('totalTime', totalTime);
	}

	console.log(`Statistics on VSCode shutdown:
    Lines written: ${linesWritten}
    Characters written: ${lettersWritten}
    Total time: ${Math.floor(totalTime / 1000)} seconds
    Files created: ${filesCreated}`);
	await putStats(
		email,
		machineId,
		linesWritten,
		lettersWritten,
		Math.floor(totalTime / 1000),
		filesCreated
	);
}