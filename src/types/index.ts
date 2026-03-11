export type StatCounters = {
    manualAdd: number;
    manualDelete: number;
    assistedAdd: number;
    assistedDelete: number;
    bulkAdd: number;
    bulkDelete: number;
    time: number;
};

export type ActiveContext = {
    language?: string;
    projectId?: string;
    since: number;
};

export type SyncedDailyStats = {
    date: string;
    byLanguage: Record<string, StatCounters>;
    byProject: Record<string, StatCounters>;
    total: StatCounters;
};

export type StatsState = {
    byLanguage: Record<string, StatCounters>;
    byProject: Record<string, StatCounters>;
    total: StatCounters;

    windowState: 'active' | 'inactive';
    activeContext: ActiveContext;
    ignoreChanges: boolean;
};

export type UpdateContext = {
    language: string;
    projectId: string;
    isBulk: boolean;
    isAssisted: boolean;
    addedLines: number;
    removedLines: number;
};

export type StatsIngestPayload = {
    date: string;
    byLanguage: Record<string, StatCounters>;
    byProject: Record<string, StatCounters>;
    total: StatCounters;
};

export type PendingStatistic = {
    id: string;
    createdAt: string;
    payload: StatsIngestPayload;
};

export type ExtensionIdentity = {
    githubEmail: string;
    machineId: string;
};

export type ExtensionLoginSuccess = {
    userId: string;
    email: string;
    accessToken: string;
    expiresAtUtc: string;
};
