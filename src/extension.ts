import * as vscode from 'vscode';
import { handleWindowStateChange } from './events/vscode/handleWindowStateChange';
import { getUserEmail } from './utils/data/getUserEmail';
import { registerTextChanges } from './events/vscode/registerTextChanges';
import { LanguageBlacklistService } from './service/LanguageBlacklistService';
import { initStatsState } from './events/initStatsState';
import { updateStatsBar } from './statusBar';
import { startGitBranchWatcher } from './events/git/startGitBranchWatcher';
import { tickActiveTime } from './events/tickActiveTime';
import { registerEditorTracking } from './events/vscode/registerEditorTracking';
import { getApiBaseUrl } from './service/api';
import { AuthService } from './service/AuthService';
import { StatsQueue } from './service/StatsQueue';
import { SyncService } from './service/SyncService';
import { StatCounters, StatsIngestPayload, StatsState } from './types';

const FRONTEND_DASHBOARD_URL = 'https://codingstats.me';
const OPEN_FRONTEND_COMMAND = 'codingstatistics.openFrontend';

let extensionContext: vscode.ExtensionContext;
let statsStatusBarItem: vscode.StatusBarItem;
let authService: AuthService | undefined;
let syncService: SyncService | undefined;
let languageBlacklistService: LanguageBlacklistService | undefined;

function hasCounters(counters: StatCounters): boolean {
	return (
		counters.manualAdd !== 0 ||
		counters.manualDelete !== 0 ||
		counters.assistedAdd !== 0 ||
		counters.assistedDelete !== 0 ||
		counters.bulkAdd !== 0 ||
		counters.bulkDelete !== 0 ||
		counters.time !== 0
	);
}

function buildPayloadFromStats(stats: StatsState): StatsIngestPayload {
	const now = new Date();
	const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

	return {
		date: localDate,
		byLanguage: Object.fromEntries(
			Object.entries(stats.byLanguage).map(([key, counters]) => [key, { ...counters }])
		),
		byProject: Object.fromEntries(
			Object.entries(stats.byProject).map(([key, counters]) => [key, { ...counters }])
		),
		total: { ...stats.total },
	};
}

async function recoverWorkspaceStatsToQueue(
	context: vscode.ExtensionContext,
	queue: StatsQueue,
) {
	const existing = context.workspaceState.get<StatsState>('stats');
	if (!existing || !hasCounters(existing.total)) {
		return;
	}

	await queue.enqueue(buildPayloadFromStats(existing));
	await context.workspaceState.update('stats', null);
}

export async function activate(context: vscode.ExtensionContext) {
	extensionContext = context;
	const statsQueue = new StatsQueue(context);
	await recoverWorkspaceStatsToQueue(context, statsQueue);

	const apiBaseUrl = getApiBaseUrl();
	const email = await getUserEmail();
	const machineId = vscode.env.machineId;

	if (!email) {
		vscode.window.showWarningMessage('GitHub email not found. Statistics will be collected locally until authentication is available.');
		await context.workspaceState.update('userEmail', null);
	}

	if (!machineId) {
		vscode.window.showWarningMessage('Machine ID not found. Statistics will be collected locally until authentication is available.');
		await context.workspaceState.update('userEmail', null);
	}

	await context.workspaceState.update('userEmail', email ?? null);
	await context.workspaceState.update('machineId', machineId ?? null);
	initStatsState(context);

	startGitBranchWatcher(context);
	registerEditorTracking(context);
	registerTextChanges(
		context,
		() => languageBlacklistService,
		() => authService?.getAccessToken() ?? null,
	);
	handleWindowStateChange(context);

	statsStatusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		100
	);

	const openFrontendCommand = vscode.commands.registerCommand(OPEN_FRONTEND_COMMAND, async () => {
		await vscode.env.openExternal(vscode.Uri.parse(FRONTEND_DASHBOARD_URL));
	});
	context.subscriptions.push(openFrontendCommand);

	statsStatusBarItem.command = OPEN_FRONTEND_COMMAND;
	statsStatusBarItem.tooltip = 'Coding Statistics';
	statsStatusBarItem.show();
	context.subscriptions.push(statsStatusBarItem);

	const tickInterval = setInterval(() => {
		tickActiveTime(context);
	}, 60000);

	const statsBarInterval = setInterval(() => {
		updateStatsBar(context, statsStatusBarItem);
	}, 1000);

	context.subscriptions.push({
		dispose() {
			clearInterval(tickInterval);
			clearInterval(statsBarInterval);
		}
	});

	languageBlacklistService = new LanguageBlacklistService(context, apiBaseUrl);

	if (email && machineId) {
		authService = new AuthService(apiBaseUrl, {
			githubEmail: email,
			machineId,
		}, {
			onAuthenticated: async (session) => {
				await languageBlacklistService?.refresh(session.accessToken);
				await syncService?.onAuthenticated();
			},
			onAuthRequired: async (reason) => {
				await syncService?.onAuthRequired(reason);
			},
			onAuthError: async (reason) => {
				await syncService?.onAuthError(reason);
			},
		});
	}

	syncService = new SyncService(context, apiBaseUrl, statsQueue, authService);
	syncService.start();

	if (!email || !machineId) {
		const reason = !email && !machineId
			? 'GitHub email and machine ID are missing.'
			: !email
				? 'GitHub email is missing.'
				: 'Machine ID is missing.';
		await syncService.onAuthRequired(reason);
	}

	authService?.start();
}

export async function deactivate() {
	if (!extensionContext) {
		console.error('Extension context is not available.');
		return;
	}
	authService?.stop();
	syncService?.stop();
	await syncService?.syncNow();
}
