import * as vscode from 'vscode';
import { registerHelloWorldCommand } from './commands/helloWorld';
import { handleFileCreation } from './events/onFileCreation';
import { handleTextDocumentChange } from './events/onTextChange';
import { handleWindowStateChange } from './events/onWindowChange';
import { getUserEmail } from './utils/getUserEmail';
let extensionContext: vscode.ExtensionContext;
export async function activate(context: vscode.ExtensionContext) {
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
	console.log('Congratulations, your extension "codingstatistics" is now active!');

	registerHelloWorldCommand();

	handleTextDocumentChange(context);
	handleFileCreation(context);
	handleWindowStateChange(context);
}

export function deactivate() {
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
    Tempo total: ${(totalTime / 1000).toFixed(2)} segundos
    Arquivos criados: ${filesCreated}`);
}
