import * as vscode from 'vscode';
import { handleWindowStateChange } from './events/vscode/handleWindowStateChange';
import { getUserEmail } from './utils/data/getUserEmail';
import { registerTextChanges } from './events/vscode/registerTextChanges';
import { initStatsState } from './events/initStatsState';
import { updateStatsBar } from './statusBar';
import { startGitBranchWatcher } from './events/git/startGitBranchWatcher';
import { tickActiveTime } from './events/tickActiveTime';
import { registerEditorTracking } from './events/vscode/registerEditorTracking';
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
	initStatsState(context);

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
}