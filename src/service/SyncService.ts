import * as vscode from 'vscode';
import { closeActiveContext } from '../utils/closeActiveContext';
import { AuthService } from './AuthService';
import { StatsQueue } from './StatsQueue';
import { StatCounters, StatsIngestPayload, StatsState } from '../types';
import { getLanguage } from '../utils/data/getLanguage';
import { getProject } from '../utils/data/getProject';

const SYNC_INTERVAL_MS = 10 * 60 * 1000;

function zeroCounters(): StatCounters {
    return {
        manualAdd: 0,
        manualDelete: 0,
        assistedAdd: 0,
        assistedDelete: 0,
        bulkAdd: 0,
        bulkDelete: 0,
        time: 0,
    };
}

function cloneCounters(counters: StatCounters): StatCounters {
    return {
        manualAdd: counters.manualAdd,
        manualDelete: counters.manualDelete,
        assistedAdd: counters.assistedAdd,
        assistedDelete: counters.assistedDelete,
        bulkAdd: counters.bulkAdd,
        bulkDelete: counters.bulkDelete,
        time: counters.time,
    };
}

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

function getLocalDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function applyDeltaToStats(
    stats: StatsState,
    language: string | undefined,
    projectId: string | undefined,
    delta: number,
) {
    if (delta <= 0) {
        return;
    }

    stats.total.time += delta;

    if (language) {
        if (!stats.byLanguage[language]) {
            stats.byLanguage[language] = zeroCounters();
        }
        stats.byLanguage[language].time += delta;
    }

    if (projectId) {
        if (!stats.byProject[projectId]) {
            stats.byProject[projectId] = zeroCounters();
        }
        stats.byProject[projectId].time += delta;
    }
}

export class SyncService {
    private readonly context: vscode.ExtensionContext;
    private readonly apiBaseUrl: string;
    private readonly queue: StatsQueue;
    private readonly authService?: AuthService;

    private syncTimer?: NodeJS.Timeout;
    private flushInFlight = false;

    constructor(
        context: vscode.ExtensionContext,
        apiBaseUrl: string,
        queue: StatsQueue,
        authService?: AuthService,
    ) {
        this.context = context;
        this.apiBaseUrl = apiBaseUrl;
        this.queue = queue;
        this.authService = authService;
    }

    public start() {
        this.syncTimer = setInterval(() => {
            void this.syncCycle();
        }, SYNC_INTERVAL_MS);
    }

    public stop() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }
    }

    public async onAuthenticated() {
        await this.flushPending();
    }

    public async syncNow(): Promise<void> {
        await this.syncCycle();
    }

    private async syncCycle() {
        const snapshot = await this.snapshotAndResetCurrentStats();
        if (snapshot) {
            await this.queue.enqueue(snapshot);
        }

        await this.flushPending();
    }

    private async flushPending() {
        if (this.flushInFlight) {
            return;
        }

        if (!this.authService?.isAuthenticated()) {
            return;
        }

        const token = this.authService.getAccessToken();
        if (!token) {
            return;
        }

        this.flushInFlight = true;
        try {
            let pending = this.queue.getAll();
            while (pending.length > 0) {
                const item = pending[0];
                let response: Response;
                try {
                    response = await fetch(`${this.apiBaseUrl}/stats`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(item.payload),
                    });
                } catch (error) {
                    console.error('Failed to sync statistics due to network error:', error);
                    return;
                }
                if (response.ok) {
                    await this.queue.removeById(item.id);
                    pending = this.queue.getAll();
                    continue;
                }

                if (response.status === 401) {
                    this.authService.invalidateSession();
                    return;
                }

                if (response.status >= 500) {
                    return;
                }

                const errorText = await response.text();
                console.error(`Failed to sync statistics (${response.status}): ${errorText}`);
                return;
            }
        } finally {
            this.flushInFlight = false;
        }
    }

    private async snapshotAndResetCurrentStats(): Promise<StatsIngestPayload | null> {
        const stats = this.context.workspaceState.get<StatsState>('stats');
        if (!stats) {
            return null;
        }

        const now = Date.now();
        closeActiveContext(stats, now, 'sync.snapshot');

        // Fallback for shutdown scenarios where window becomes inactive before
        // closeActiveContext can attribute the in-flight delta.
        const fallbackLanguage = stats.activeContext.language;
        const fallbackProjectId = stats.activeContext.projectId;
        if (fallbackLanguage || fallbackProjectId) {
            const fallbackDelta = Math.max(0, now - stats.activeContext.since);
            applyDeltaToStats(stats, fallbackLanguage, fallbackProjectId, fallbackDelta);
            stats.activeContext = { since: now };
        }

        if (!hasCounters(stats.total)) {
            await this.resetStats(stats, now);
            return null;
        }

        const payload: StatsIngestPayload = {
            date: getLocalDateKey(new Date(now)),
            byLanguage: Object.fromEntries(
                Object.entries(stats.byLanguage).map(([key, value]) => [key, cloneCounters(value)])
            ),
            byProject: Object.fromEntries(
                Object.entries(stats.byProject).map(([key, value]) => [key, cloneCounters(value)])
            ),
            total: cloneCounters(stats.total),
        };

        await this.resetStats(stats, now);
        return payload;
    }

    private async resetStats(stats: StatsState, now: number) {
        const activeEditor = vscode.window.activeTextEditor;
        const nextLanguage = activeEditor ? getLanguage(activeEditor.document) : undefined;
        const nextProject = activeEditor
            ? getProject(activeEditor.document)
            : undefined;

        const nextState: StatsState = {
            byLanguage: {},
            byProject: {},
            total: zeroCounters(),
            windowState: stats.windowState,
            ignoreChanges: false,
            activeContext: stats.windowState === 'active'
                ? { language: nextLanguage, projectId: nextProject, since: now }
                : { since: now },
        };

        await this.context.workspaceState.update('stats', nextState);
    }
}
