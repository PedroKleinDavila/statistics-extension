import * as vscode from 'vscode';
import { StatsState } from '../types';
import { getTime } from '../utils/data/getTime';
import { getLines } from '../utils/data/getLines';
import { getProject } from '../utils/data/getProject';
import { getLanguage } from '../utils/data/getLanguage';

export function updateStatsBar(
	context: vscode.ExtensionContext,
	statusBarItem: vscode.StatusBarItem,
) {
	const stats = context.workspaceState.get<StatsState>('stats');
	if (!stats) {
		statusBarItem.hide();
		return;
	}

	const totalTime = getTime(stats.total.time);
	const totalLines = getLines(stats.total.manualAdd - stats.total.manualDelete);

	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const language = getLanguage(editor.document);
	const project = getProject(editor.document);

	let languageText = '—';
	if (language && stats.byLanguage[language]) {
		languageText = `${language.toUpperCase()} ${getTime(
			stats.byLanguage[language].time
		)}`;
	}

	let projectText = '—';
	if (project && stats.byProject[project]) {
		projectText = `${project} ${getTime(
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
