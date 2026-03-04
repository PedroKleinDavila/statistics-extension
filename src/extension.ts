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
	//console.log('extension.activate.start', {
	// workspaceFolders: vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath).length ?? 0,
	// 	activeEditor: vscode.window.activeTextEditor?.document.uri.toString() ?? null,
	// });

	extensionContext = context;
	const email = await getUserEmail();
	const machineId = vscode.env.machineId;
	//console.log(email);
	//console.log('extension.activate.identity.loaded', {
	// hasEmail: Boolean(email),
	// 	hasMachineId: Boolean(machineId),
	// 	});
	if (!email) {
		vscode.window.showErrorMessage('User email not found. Please log in to the extension.');
		context.workspaceState.update('userEmail', null);
		//console.log('extension.activate.abort.missingEmail');
		return;
	}
	if (!machineId) {
		vscode.window.showErrorMessage('Machine ID not found. Please check your VSCode installation.');
		context.workspaceState.update('userEmail', null);
		//console.log('extension.activate.abort.missingMachineId');
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
	//console.log('extension.activate.stats.initialized');

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
	//console.log('extension.activate.interval.tickActiveTime.created', { intervalMs: 60000 });
	const statsBarInterval = setInterval(() => {
		updateStatsBar(context, statsStatusBarItem);
	}, 500);
	//console.log('extension.activate.interval.statusBar.created', { intervalMs: 500 });

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
	//console.log('extension.deactivate.start');
	const email = extensionContext.workspaceState.get('userEmail', null);
	if (email) {
		//console.log(`Logged in user: ${email}`);
		//console.log('extension.deactivate.user', { hasEmail: true });
	} else {
		//console.log('User not authenticated or email unavailable');
		//console.log('extension.deactivate.user', { hasEmail: false });
		return;
	}
}