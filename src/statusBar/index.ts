import * as vscode from 'vscode';
import { PENDING_STATS_BY_DAY_KEY } from '../service/StatsQueue';
import { SYNC_META_STATE_KEY, SyncMetaState } from '../service/syncMetaState';
import { SYNCED_DAILY_STATS_KEY } from '../service/syncedDailyState';
import { StatCounters, StatsState, SyncedDailyStats } from '../types';
import { getLines } from '../utils/data/getLines';
import { getLanguage } from '../utils/data/getLanguage';
import { getProject } from '../utils/data/getProject';

type StatusBarMode = 'compact' | 'balanced' | 'deep';
type PrimaryMetric = 'time' | 'manualLines' | 'netLines' | 'assistedShare' | 'productivityScore';
type TimeFormat = 'human' | 'hhmmss' | 'minutes';

const TOOLTIP_MIN_UPDATE_MS = 15_000;
let lastTooltipUpdateAt = 0;
let lastTooltipStableKey = '';

function getLocalDateKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatSigned(value: number): string {
	return value >= 0 ? `+${getLines(value)}` : `-${getLines(Math.abs(value))}`;
}

function formatDuration(ms: number, format: TimeFormat): string {
	const safeMs = Math.max(0, ms);
	const totalSeconds = Math.floor(safeMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (format === 'hhmmss') {
		return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	if (format === 'minutes') {
		const decimalMinutes = safeMs / 60000;
		return `${decimalMinutes.toFixed(1)}m`;
	}

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	}
	return `${seconds}s`;
}

function mergeCounters(
	base: StatCounters | undefined,
	local: StatCounters,
): StatCounters {
	return {
		manualAdd: (base?.manualAdd ?? 0) + local.manualAdd,
		manualDelete: (base?.manualDelete ?? 0) + local.manualDelete,
		assistedAdd: (base?.assistedAdd ?? 0) + local.assistedAdd,
		assistedDelete: (base?.assistedDelete ?? 0) + local.assistedDelete,
		bulkAdd: (base?.bulkAdd ?? 0) + local.bulkAdd,
		bulkDelete: (base?.bulkDelete ?? 0) + local.bulkDelete,
		time: (base?.time ?? 0) + local.time,
	};
}

function readMode(): StatusBarMode {
	const value = vscode.workspace.getConfiguration('codingstatistics').get<string>('statusBar.mode', 'balanced');
	if (value === 'compact' || value === 'balanced' || value === 'deep') {
		return value;
	}
	return 'balanced';
}

function readPrimaryMetric(): PrimaryMetric {
	const value = vscode.workspace.getConfiguration('codingstatistics').get<string>('statusBar.primaryMetric', 'time');
	if (
		value === 'time' ||
		value === 'manualLines' ||
		value === 'netLines' ||
		value === 'assistedShare' ||
		value === 'productivityScore'
	) {
		return value;
	}
	return 'time';
}

function readTimeFormat(): TimeFormat {
	const value = vscode.workspace.getConfiguration('codingstatistics').get<string>('statusBar.timeFormat', 'human');
	if (value === 'human' || value === 'hhmmss' || value === 'minutes') {
		return value;
	}
	return 'human';
}

function getPendingCount(context: vscode.ExtensionContext): number {
	const pendingByDay = context.globalState.get<Record<string, unknown>>(PENDING_STATS_BY_DAY_KEY, {});
	return Object.keys(pendingByDay).length;
}

function pickIcon(sync: SyncMetaState | undefined, pendingCount: number): string {
	if (pendingCount >= 10) {
		return 'warning';
	}
	if (sync?.status === 'auth_required' || (sync?.status === 'error' && pendingCount > 0)) {
		return 'cloud-offline';
	}
	if (pendingCount > 0 || sync?.status === 'syncing') {
		return 'sync~spin';
	}
	if (sync?.status === 'ok') {
		return 'check';
	}
	return 'pulse';
}

function getTopByTime(
	map: Record<string, StatCounters>,
	limit = 3,
): Array<{ name: string; time: number }> {
	return Object.entries(map)
		.map(([name, counters]) => ({ name, time: counters.time }))
		.filter(entry => entry.time > 0)
		.sort((a, b) => b.time - a.time)
		.slice(0, limit);
}

export function updateStatsBar(
	context: vscode.ExtensionContext,
	statusBarItem: vscode.StatusBarItem,
) {
	const stats = context.workspaceState.get<StatsState>('stats');
	if (!stats) {
		statusBarItem.hide();
		return;
	}

	const mode = readMode();
	const primaryMetric = readPrimaryMetric();
	const timeFormat = readTimeFormat();
	const pendingCount = getPendingCount(context);
	const syncMeta = context.workspaceState.get<SyncMetaState>(SYNC_META_STATE_KEY);

	const todayKey = getLocalDateKey(new Date());
	const syncedDaily = context.workspaceState.get<SyncedDailyStats>(SYNCED_DAILY_STATS_KEY);
	const syncedDailyToday = syncedDaily?.date === todayKey
		? syncedDaily
		: undefined;

	const totalCounters = mergeCounters(syncedDailyToday?.total, stats.total);
	const editor = vscode.window.activeTextEditor;
	const language = stats.activeContext.language ?? (editor ? getLanguage(editor.document) : undefined);
	const project = stats.activeContext.projectId ?? (editor ? getProject(editor.document) : undefined);
	const now = Date.now();
	const liveDelta = stats.windowState === 'active'
		? Math.max(0, now - stats.activeContext.since)
		: 0;

	const manualNet = totalCounters.manualAdd - totalCounters.manualDelete;
	const assistedNet = totalCounters.assistedAdd - totalCounters.assistedDelete;
	const bulkNet = totalCounters.bulkAdd - totalCounters.bulkDelete;
	const totalAdd = totalCounters.manualAdd + totalCounters.assistedAdd + totalCounters.bulkAdd;
	const totalDelete = totalCounters.manualDelete + totalCounters.assistedDelete + totalCounters.bulkDelete;
	const totalNet = totalAdd - totalDelete;
	const totalTouched = totalAdd + totalDelete;
	const manualTouched = totalCounters.manualAdd + totalCounters.manualDelete;
	const assistedTouched = totalCounters.assistedAdd + totalCounters.assistedDelete;
	const bulkTouched = totalCounters.bulkAdd + totalCounters.bulkDelete;
	const assistedShare = totalTouched > 0 ? assistedTouched / totalTouched : 0;
	const bulkShare = totalTouched > 0 ? bulkTouched / totalTouched : 0;
	const totalTimeMs = totalCounters.time + liveDelta;
	const linesPerHour = totalTimeMs > 0 ? totalNet / (totalTimeMs / 3_600_000) : 0;
	const productivityScore = Math.max(0, Math.min(100, Math.round(linesPerHour * (manualTouched / Math.max(1, totalTouched)) * 4)));

	const languageTimeMs = language
		? (syncedDailyToday?.byLanguage[language]?.time ?? 0) + (stats.byLanguage[language]?.time ?? 0) + (stats.activeContext.language === language ? liveDelta : 0)
		: 0;
	const projectTimeMs = project
		? (syncedDailyToday?.byProject[project]?.time ?? 0) + (stats.byProject[project]?.time ?? 0) + (stats.activeContext.projectId === project ? liveDelta : 0)
		: 0;

	const totalTimeText = formatDuration(totalTimeMs, timeFormat);
	const languageText = language ? `${language.toUpperCase()} ${formatDuration(languageTimeMs, timeFormat)}` : '—';
	const projectText = project ? `${project} ${formatDuration(projectTimeMs, timeFormat)}` : '—';

	const primaryMetricText = (() => {
		if (primaryMetric === 'time') {
			return totalTimeText;
		}
		if (primaryMetric === 'manualLines') {
			return `${formatSigned(manualNet)} manual`;
		}
		if (primaryMetric === 'netLines') {
			return `${formatSigned(totalNet)} net`;
		}
		if (primaryMetric === 'assistedShare') {
			return `${(assistedShare * 100).toFixed(0)}% AI`;
		}
		return `${productivityScore} score`;
	})();

	const icon = pickIcon(syncMeta, pendingCount);

	if (mode === 'compact') {
		const compactSecondary = primaryMetric === 'time'
			? `${formatSigned(totalNet)} net`
			: primaryMetricText;
		statusBarItem.text = `$(${icon}) ${totalTimeText} • ${compactSecondary}`;
	} else if (mode === 'balanced') {
		statusBarItem.text =
			`$(${icon}) ${totalTimeText} • ${primaryMetricText} | ` +
			`M ${formatSigned(manualNet)} • AI ${(assistedShare * 100).toFixed(0)}% • B ${(bulkShare * 100).toFixed(0)}%`;
	} else {
		statusBarItem.text =
			`$(${icon}) ${totalTimeText} • ${primaryMetricText} | ` +
			`$(code) ${languageText} | $(repo) ${projectText}`;
	}

	const mergedLanguageMap = { ...(syncedDailyToday?.byLanguage ?? {}) };
	for (const [key, value] of Object.entries(stats.byLanguage)) {
		mergedLanguageMap[key] = mergeCounters(mergedLanguageMap[key], value);
	}
	const mergedProjectMap = { ...(syncedDailyToday?.byProject ?? {}) };
	for (const [key, value] of Object.entries(stats.byProject)) {
		mergedProjectMap[key] = mergeCounters(mergedProjectMap[key], value);
	}

	const topLanguages = getTopByTime(mergedLanguageMap)
		.map(item => `${item.name.toUpperCase()} ${formatDuration(item.time, timeFormat)}`)
		.join(' | ') || '—';
	const topProjects = getTopByTime(mergedProjectMap)
		.map(item => `${item.name} ${formatDuration(item.time, timeFormat)}`)
		.join(' | ') || '—';

	const syncStatusText = syncMeta?.status ?? 'idle';
	const lastSuccessText = syncMeta?.lastSuccessAt
		? new Date(syncMeta.lastSuccessAt).toLocaleTimeString()
		: '—';
	const lastErrorText = syncMeta?.lastErrorAt
		? `${new Date(syncMeta.lastErrorAt).toLocaleTimeString()}${syncMeta.lastErrorMessage ? ` (${syncMeta.lastErrorMessage})` : ''}`
		: '—';

	const tooltipText =
		`Today (Total)\n` +
		`• Time: ${totalTimeText}\n` +
		`• Net lines: ${formatSigned(totalNet)}\n` +
		`• Manual: ${formatSigned(manualNet)} | Assisted: ${formatSigned(assistedNet)} | Bulk: ${formatSigned(bulkNet)}\n\n` +
		`Rates\n` +
		`• Lines/hour: ${linesPerHour.toFixed(1)}\n` +
		`• Assisted: ${(assistedShare * 100).toFixed(1)}% | Bulk: ${(bulkShare * 100).toFixed(1)}%\n` +
		`• Score: ${productivityScore}\n\n` +
		`Current Context\n` +
		`• Language: ${languageText}\n` +
		`• Project: ${projectText}\n\n` +
		`Top Languages (time)\n` +
		`• ${topLanguages}\n\n` +
		`Top Projects (time)\n` +
		`• ${topProjects}\n\n` +
		`Synchronization\n` +
		`• Status: ${syncStatusText}\n` +
		`• Pending uploads: ${pendingCount}\n` +
		`• Last successful sync: ${lastSuccessText}\n`;

	const nowForTooltip = Date.now();
	const tooltipStableKey = [
		mode,
		primaryMetric,
		timeFormat,
		syncStatusText,
		pendingCount,
		Math.floor(totalTimeMs / 60_000),
		totalNet,
		manualNet,
		assistedNet,
		bulkNet,
		language ?? '',
		project ?? '',
		topLanguages,
		topProjects,
	].join('|');

	const shouldRefreshTooltip =
		statusBarItem.tooltip === 'Coding Statistics' ||
		tooltipStableKey !== lastTooltipStableKey ||
		(nowForTooltip - lastTooltipUpdateAt) >= TOOLTIP_MIN_UPDATE_MS;

	if (shouldRefreshTooltip) {
		statusBarItem.tooltip = tooltipText;
		lastTooltipUpdateAt = nowForTooltip;
		lastTooltipStableKey = tooltipStableKey;
	}

	statusBarItem.show();
}
