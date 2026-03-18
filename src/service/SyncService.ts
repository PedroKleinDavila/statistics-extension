import * as vscode from 'vscode';
import { closeActiveContext } from '../utils/closeActiveContext';
import { AuthService } from './AuthService';
import { StatsQueue } from './StatsQueue';
import { StatCounters, StatsIngestPayload, StatsState, SyncedDailyStats } from '../types';
import { getLanguage } from '../utils/data/getLanguage';
import { getProject } from '../utils/data/getProject';
import { SYNCED_DAILY_STATS_KEY } from './syncedDailyState';
import { SYNC_META_STATE_KEY, SyncMetaState, SyncStatus } from './syncMetaState';

const SYNC_INTERVAL_MS = 10 * 60 * 1000;

type ApiStatCounters = {
    manualAdd?: number;
    manualDelete?: number;
    assistedAdd?: number;
    assistedDelete?: number;
    bulkAdd?: number;
    bulkDelete?: number;
    timeMs?: number;
    time?: number;
};

type ApiStatsIngestRequest = {
    date: string;
    byLanguage: Record<string, ApiStatCounters>;
    byProject: Record<string, ApiStatCounters>;
    total: ApiStatCounters;
};

type ApiDailyStatsResponse = {
    date?: string;
    byLanguage?: Record<string, ApiStatCounters>;
    byProject?: Record<string, ApiStatCounters>;
    totals?: ApiStatCounters;
    total?: ApiStatCounters;
} | null;

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

function toNumber(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 0;
    }

    return value;
}

function toApiCounters(counters: StatCounters): ApiStatCounters {
    return {
        manualAdd: counters.manualAdd,
        manualDelete: counters.manualDelete,
        assistedAdd: counters.assistedAdd,
        assistedDelete: counters.assistedDelete,
        bulkAdd: counters.bulkAdd,
        bulkDelete: counters.bulkDelete,
        timeMs: counters.time,
    };
}

function toApiIngestPayload(payload: StatsIngestPayload): ApiStatsIngestRequest {
    return {
        date: payload.date,
        byLanguage: Object.fromEntries(
            Object.entries(payload.byLanguage).map(([key, counters]) => [key, toApiCounters(counters)])
        ),
        byProject: Object.fromEntries(
            Object.entries(payload.byProject).map(([key, counters]) => [key, toApiCounters(counters)])
        ),
        total: toApiCounters(payload.total),
    };
}

function fromApiCounters(counters: ApiStatCounters | undefined): StatCounters {
    return {
        manualAdd: toNumber(counters?.manualAdd),
        manualDelete: toNumber(counters?.manualDelete),
        assistedAdd: toNumber(counters?.assistedAdd),
        assistedDelete: toNumber(counters?.assistedDelete),
        bulkAdd: toNumber(counters?.bulkAdd),
        bulkDelete: toNumber(counters?.bulkDelete),
        time: toNumber(counters?.timeMs ?? counters?.time),
    };
}

function fromApiCounterMap(
    source: Record<string, ApiStatCounters> | undefined,
): Record<string, StatCounters> {
    if (!source) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(source)
            .filter(([key]) => key.trim().length > 0)
            .map(([key, counters]) => [key, fromApiCounters(counters)])
    );
}

function normalizeSyncedDaily(
    date: string,
    payload: ApiDailyStatsResponse,
): SyncedDailyStats {
    return {
        date,
        byLanguage: fromApiCounterMap(payload?.byLanguage),
        byProject: fromApiCounterMap(payload?.byProject),
        total: fromApiCounters(payload?.totals ?? payload?.total),
    };
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
    private syncDailyInFlight = false;
    private syncCycleInFlight = false;

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
        void this.updateSyncMeta({ status: 'idle', isAuthenticated: this.authService?.isAuthenticated() ?? false });
    }

    public stop() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }
    }

    public async onAuthenticated() {
        const token = this.getSyncToken();
        if (!token) {
            await this.updateSyncMeta({ status: 'auth_required', isAuthenticated: false });
            return;
        }

        await this.updateSyncMeta({ status: 'idle', isAuthenticated: true });
        await this.syncCurrentDayFromBackend(token);
        const flushed = await this.flushPending(token);
        if (!flushed) {
            return;
        }

        await this.syncCurrentDayFromBackend(token);
    }

    public async onAuthRequired(reason: string) {
        await this.updateSyncMeta(
            { isAuthenticated: false, lastErrorAt: Date.now(), lastErrorMessage: reason },
            'auth_required'
        );
    }

    public async onAuthError(reason: string) {
        await this.updateSyncMeta(
            { isAuthenticated: false, lastErrorAt: Date.now(), lastErrorMessage: reason },
            'error'
        );
    }

    public async syncNow(): Promise<void> {
        await this.syncCycle();
    }

    private async syncCycle() {
        if (this.syncCycleInFlight) {
            return;
        }

        const token = this.getSyncToken();
        if (!token) {
            await this.updateSyncMeta({ status: 'auth_required', isAuthenticated: false });
            return;
        }

        this.syncCycleInFlight = true;
        try {
            const snapshot = await this.snapshotAndResetCurrentStats();
            if (snapshot) {
                await this.queue.enqueue(snapshot);
            }

            const flushed = await this.flushPending(token);
            if (!flushed) {
                return;
            }

            await this.syncCurrentDayFromBackend(token);
        } finally {
            this.syncCycleInFlight = false;
        }
    }

    private getSyncToken(): string | null {
        if (!this.authService?.isAuthenticated()) {
            return null;
        }

        return this.authService.getAccessToken();
    }

    private async updateSyncMeta(
        patch: Partial<Omit<SyncMetaState, 'pendingCount'>>,
        overrideStatus?: SyncStatus,
    ) {
        const current = this.context.workspaceState.get<SyncMetaState>(SYNC_META_STATE_KEY, {
            status: 'idle',
            isAuthenticated: false,
            pendingCount: this.queue.size(),
        });

        const next: SyncMetaState = {
            ...current,
            ...patch,
            status: overrideStatus ?? patch.status ?? current.status,
            pendingCount: this.queue.size(),
        };

        await this.context.workspaceState.update(SYNC_META_STATE_KEY, next);
    }

    private async flushPending(token: string): Promise<boolean> {
        if (this.flushInFlight) {
            return false;
        }

        this.flushInFlight = true;
        try {
            await this.updateSyncMeta({ isAuthenticated: true, lastAttemptAt: Date.now() }, 'syncing');
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
                        body: JSON.stringify(toApiIngestPayload(item.payload)),
                    });
                } catch (error) {
                    console.error('Failed to sync statistics due to network error:', error);
                    await this.updateSyncMeta(
                        { isAuthenticated: true, lastErrorAt: Date.now(), lastErrorMessage: 'Network error while sending pending stats.' },
                        'error'
                    );
                    return false;
                }
                if (response.ok) {
                    await this.queue.removeById(item.id);
                    pending = this.queue.getAll();
                    continue;
                }

                if (response.status === 401) {
                    this.authService?.invalidateSession();
                    await this.updateSyncMeta(
                        { isAuthenticated: false, lastErrorAt: Date.now(), lastErrorMessage: 'Authentication expired (401).' },
                        'auth_required'
                    );
                    return false;
                }

                if (response.status >= 500) {
                    await this.updateSyncMeta(
                        { isAuthenticated: true, lastErrorAt: Date.now(), lastErrorMessage: `Server error (${response.status}) while sending pending stats.` },
                        'error'
                    );
                    return false;
                }

                const errorText = await response.text();
                console.error(`Failed to sync statistics (${response.status}): ${errorText}`);
                await this.updateSyncMeta(
                    { isAuthenticated: true, lastErrorAt: Date.now(), lastErrorMessage: `Request rejected (${response.status}).` },
                    'error'
                );
                return false;
            }

            await this.updateSyncMeta(
                { isAuthenticated: true, lastSuccessAt: Date.now(), lastErrorMessage: undefined },
                'ok'
            );
            return true;
        } finally {
            this.flushInFlight = false;
        }
    }

    private async syncCurrentDayFromBackend(token: string) {
        if (this.syncDailyInFlight) {
            return;
        }

        this.syncDailyInFlight = true;
        try {
            const dateKey = getLocalDateKey(new Date());
            let response: Response;

            try {
                response = await fetch(`${this.apiBaseUrl}/stats/${dateKey}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            } catch (error) {
                console.error('Failed to fetch synced daily statistics due to network error:', error);
                await this.updateSyncMeta(
                    { isAuthenticated: true, lastErrorAt: Date.now(), lastErrorMessage: 'Network error while fetching daily stats.' },
                    'error'
                );
                return;
            }

            if (response.status === 401) {
                this.authService?.invalidateSession();
                await this.updateSyncMeta(
                    { isAuthenticated: false, lastErrorAt: Date.now(), lastErrorMessage: 'Authentication expired (401).' },
                    'auth_required'
                );
                return;
            }

            if (response.status >= 500) {
                await this.updateSyncMeta(
                    { isAuthenticated: true, lastErrorAt: Date.now(), lastErrorMessage: `Server error (${response.status}) while fetching daily stats.` },
                    'error'
                );
                return;
            }

            if (!response.ok) {
                const body = await response.text();
                console.error(`Failed to fetch synced daily statistics (${response.status}): ${body}`);
                await this.updateSyncMeta(
                    { isAuthenticated: true, lastErrorAt: Date.now(), lastErrorMessage: `Daily fetch rejected (${response.status}).` },
                    'error'
                );
                return;
            }

            let payload: ApiDailyStatsResponse = null;
            try {
                payload = await response.json() as ApiDailyStatsResponse;
            } catch {
                payload = null;
            }

            const syncedDaily = normalizeSyncedDaily(dateKey, payload);
            await this.context.workspaceState.update(SYNCED_DAILY_STATS_KEY, syncedDaily);
            await this.updateSyncMeta({ isAuthenticated: true, lastSuccessAt: Date.now(), lastErrorMessage: undefined }, 'ok');
        } finally {
            this.syncDailyInFlight = false;
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
