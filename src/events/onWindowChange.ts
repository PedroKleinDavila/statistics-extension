import * as vscode from 'vscode';

export function handleWindowStateChange(context: vscode.ExtensionContext) {
	context.workspaceState.update('startTime', Date.now());

	vscode.window.onDidChangeWindowState(async (e) => {
		if (e.focused) {
			context.workspaceState.update('startTime', Date.now());
		} else {
			const startTime = context.workspaceState.get<number | null>('startTime', null);
			if (startTime !== null) {
				const sessionTime = Date.now() - startTime;
				const totalTime = context.workspaceState.get('totalTime', 0) + sessionTime;

				context.workspaceState.update('totalTime', totalTime);
				context.workspaceState.update('startTime', null);
			}
		}
	});
}
