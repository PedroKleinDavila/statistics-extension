import * as vscode from 'vscode';
import { handleFileCreation } from './events/onFileCreation';
import { handleTextDocumentChange } from './events/onTextChange';
import { handleWindowStateChange } from './events/onWindowChange';
import { getUserEmail } from './utils/getUserEmail';
import { putStats } from './service/putStats';
let extensionContext: vscode.ExtensionContext;
let statsStatusBarItem: vscode.StatusBarItem;
export async function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('codingstatistics');
	if (config.get('apiUrl') === "asd") {
		await vscode.window.showErrorMessage(
			'URL da API não configurada. Por favor, configure a URL da API nas configurações da extensão.'
		);
		return;
	}
	extensionContext = context;
	const email = await getUserEmail();
	if (email) {
		context.workspaceState.update('userEmail', email);
	} else {
		context.workspaceState.update('userEmail', null);
	}
	context.workspaceState.update('linesWritten', 0);
	context.workspaceState.update('lettersWritten', 0);
	context.workspaceState.update('totalTime', 0);
	context.workspaceState.update('filesCreated', 0);
	context.workspaceState.update('windowState', 'active');
	context.workspaceState.update('startTime', Date.now());

	statsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statsStatusBarItem.tooltip = 'Estatísticas de Codificação';
	statsStatusBarItem.show();
	context.subscriptions.push(statsStatusBarItem);
	updateStatsBar();

	handleTextDocumentChange(context, updateStatsBar);
	handleFileCreation(context, updateStatsBar);
	handleWindowStateChange(context);
}

export async function deactivate() {
	const email = extensionContext.workspaceState.get('userEmail', null);
	if (email) {
		console.log(`Usuário logado: ${email}`);
	} else {
		console.log('Usuário não autenticado ou e-mail indisponível');
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

	if (startTime !== null) {
		const sessionTime = Date.now() - startTime;
		totalTime += sessionTime;
		extensionContext.workspaceState.update('totalTime', totalTime);
	}

	console.log(`Estatísticas ao fechar o VSCode:
    Linhas escritas: ${linesWritten}
    Letras escritas: ${lettersWritten}
    Tempo total: ${Math.floor(totalTime / 1000)} segundos
    Arquivos criados: ${filesCreated}`);
	await putStats(
		email,
		linesWritten,
		lettersWritten,
		Math.floor(totalTime / 1000),
		filesCreated
	);
}

function updateStatsBar() {
	if (!extensionContext || !statsStatusBarItem) { return; }

	const lines = extensionContext.workspaceState.get('linesWritten', 0);
	const letters = extensionContext.workspaceState.get('lettersWritten', 0);
	const files = extensionContext.workspaceState.get('filesCreated', 0);

	statsStatusBarItem.text = `$(pencil) ${lines} linhas • ${letters} letras • ${files} arquivos`;
}