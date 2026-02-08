import * as vscode from 'vscode';
import { handleWindowStateChange } from './events/handleWindowStateChange';
import { getUserEmail } from './utils/getUserEmail';
import { registerTextChanges } from './events/registerTextChanges';
import { initStatsState } from './events/initStatsState';
import { updateStatsBar } from './statusBar';
import { startGitBranchWatcher } from './events/startGitBranchWatcher';
import { tickActiveTime } from './utils/tickActiveTime';
import { registerEditorTracking } from './events/registerEditorTracking';
let extensionContext: vscode.ExtensionContext;
let statsStatusBarItem: vscode.StatusBarItem;
export async function activate(context: vscode.ExtensionContext) {
	extensionContext = context;
	const email = await getUserEmail();
	const machineId = vscode.env.machineId;
	console.log(email);
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
	// const authenticated = await authUser(email, machineId);
	// context.workspaceState.update('needsLogin', false);
	// if (authenticated === "User not found") {//achar forma de tentar de novo depois de um tempo
	// 	vscode.window.showErrorMessage('User not found. Please check your email or register.');
	// 	context.workspaceState.update('needsLogin', true);
	// 	context.workspaceState.update('userEmail', null);
	// 	vscode.env.openExternal(vscode.Uri.parse(`https://coding-statistics-frontend.vercel.app/${email}/${machineId}`));
	// }
	// if (!authenticated) {//achar forma de tentar de novo depois de um tempo
	// 	vscode.window.showErrorMessage('Authentication failed. Please check your internet connection.');
	// 	context.workspaceState.update('needsLogin', true);
	// 	context.workspaceState.update('userEmail', null);
	// }
	context.workspaceState.update('userEmail', email);
	context.workspaceState.update('machineId', machineId);
	const document = vscode.window.activeTextEditor?.document;
	initStatsState(context, document);

	startGitBranchWatcher(context);
	registerEditorTracking(context);
	registerTextChanges(context);
	handleWindowStateChange(context);

	statsStatusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		100
	);

	statsStatusBarItem.tooltip = 'Coding Statistics';
	statsStatusBarItem.show();
	context.subscriptions.push(statsStatusBarItem);

	const tickInterval = setInterval(() => {
		tickActiveTime(context);
	}, 60000);
	const statsBarInterval = setInterval(() => {
		updateStatsBar(context, statsStatusBarItem);
	}, 500);

	context.subscriptions.push({
		dispose() {
			clearInterval(tickInterval);
			clearInterval(statsBarInterval);
		}
	});
}

export async function deactivate() {
	if (!extensionContext) {
		console.error('Extension context is not available.');
		return;
	}
	const email = extensionContext.workspaceState.get('userEmail', null);
	if (email) {
		console.log(`Logged in user: ${email}`);
	} else {
		console.log('User not authenticated or email unavailable');
		return;
	}
	extensionContext.workspaceState.update('stats', null);
	// const linesWritten = extensionContext.workspaceState.get('linesWritten', 0);
	// const lettersWritten = extensionContext.workspaceState.get('lettersWritten', 0);
	// const filesCreated = extensionContext.workspaceState.get('filesCreated', 0);
	// let totalTime = extensionContext.workspaceState.get('totalTime', 0);
	// const startTime = extensionContext.workspaceState.get('startTime', null);
	// const machineId = extensionContext.workspaceState.get('machineId', null) ?? "";

	// if (startTime !== null) {
	// 	const sessionTime = Date.now() - startTime;
	// 	totalTime += sessionTime;
	// 	extensionContext.workspaceState.update('totalTime', totalTime);
	// }

	// console.log(`Statistics on VSCode shutdown:
	// Lines written: ${linesWritten}
	// Characters written: ${lettersWritten}
	// Total time: ${Math.floor(totalTime / 1000)} seconds
	// Files created: ${filesCreated}`);
	// await putStats(
	// 	email,
	// 	machineId,
	// 	linesWritten,
	// 	lettersWritten,
	// 	Math.floor(totalTime / 1000),
	// 	filesCreated
	// );
}