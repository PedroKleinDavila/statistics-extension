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

	const totalLines = getLines(stats.total.manualAdd - stats.total.manualDelete);

	const editor = vscode.window.activeTextEditor;
	const language = stats.activeContext.language
		?? (editor ? getLanguage(editor.document) : undefined);
	const project = stats.activeContext.projectId
		?? (editor ? getProject(editor.document) : undefined);
	const now = Date.now();
	const liveDelta = stats.windowState === 'active'
		? Math.max(0, now - stats.activeContext.since)
		: 0;

	const totalTime = getTime(stats.total.time + liveDelta);

	const languageBaseTime = language ? (stats.byLanguage[language]?.time ?? 0) : 0;
	const languageLiveTime =
		stats.activeContext.language === language ? liveDelta : 0;
	const languageText = language
		? `${language.toUpperCase()} ${getTime(languageBaseTime + languageLiveTime)}`
		: '—';

	const projectBaseTime = project ? (stats.byProject[project]?.time ?? 0) : 0;
	const projectLiveTime =
		stats.activeContext.projectId === project ? liveDelta : 0;
	const projectText = project
		? `${project} ${getTime(projectBaseTime + projectLiveTime)}`
		: '—';

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
