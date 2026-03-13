export const SYNC_META_STATE_KEY = 'syncMetaState';

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'auth_required';

export type SyncMetaState = {
    status: SyncStatus;
    isAuthenticated: boolean;
    pendingCount: number;
    lastAttemptAt?: number;
    lastSuccessAt?: number;
    lastErrorAt?: number;
    lastErrorMessage?: string;
};
