import * as vscode from 'vscode';
import { StatsState } from '../types';
import { formatTime } from '../utils/formatTime';
import { formatLines } from '../utils/formatLines';
import { getProject } from '../utils/getProject';
import { getLanguage } from '../utils/getLanguage';

export function updateStatsBar(
	context: vscode.ExtensionContext,
	statusBarItem: vscode.StatusBarItem,
) {
	const stats = context.workspaceState.get<StatsState>('stats');
	if (!stats) {
		statusBarItem.hide();
		return;
	}

	const totalTime = formatTime(stats.total.time);
	const totalLines = formatLines(stats.total.manualAdd - stats.total.manualDelete);

	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const language = getLanguage(editor.document);
	const project = getProject(editor.document);

	let languageText = '—';
	if (language && stats.byLanguage[language]) {
		languageText = `${language.toUpperCase()} ${formatTime(
			stats.byLanguage[language].time
		)}`;
	}

	let projectText = '—';
	if (project && stats.byProject[project]) {
		projectText = `${project} ${formatTime(
			stats.byProject[project].time
		)}`;
	}

	statusBarItem.text =
		`$(pulse) ${totalTime} • ${totalLines}L | ` +
		`$(code) ${languageText} | ` +
		`$(repo) ${projectText}`;

	statusBarItem.tooltip =
		`Total time: ${totalTime}\n` +
		`Total lines: ${totalLines}\n` +
		`Language: ${languageText}\n` +
		`Project: ${projectText}`;

	statusBarItem.show();
}
