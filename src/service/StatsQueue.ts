import * as vscode from 'vscode';
import { PendingStatistic, StatsIngestPayload } from '../types';

export const PENDING_STATS_BY_DAY_KEY = 'pendingStatisticsByDay';

type PendingByDay = Record<string, StatsIngestPayload>;

function clonePayload(payload: StatsIngestPayload): StatsIngestPayload {
    return {
        date: payload.date,
        byLanguage: Object.fromEntries(
            Object.entries(payload.byLanguage).map(([key, counters]) => [key, { ...counters }])
        ),
        byProject: Object.fromEntries(
            Object.entries(payload.byProject).map(([key, counters]) => [key, { ...counters }])
        ),
        total: { ...payload.total },
    };
}

function mergeCounterMaps(
    target: Record<string, StatsIngestPayload['total']>,
    source: Record<string, StatsIngestPayload['total']>,
) {
    for (const [key, counters] of Object.entries(source)) {
        if (!target[key]) {
            target[key] = { ...counters };
            continue;
        }

        target[key].manualAdd += counters.manualAdd;
        target[key].manualDelete += counters.manualDelete;
        target[key].assistedAdd += counters.assistedAdd;
        target[key].assistedDelete += counters.assistedDelete;
        target[key].bulkAdd += counters.bulkAdd;
        target[key].bulkDelete += counters.bulkDelete;
        target[key].time += counters.time;
    }
}

function mergePayload(target: StatsIngestPayload, source: StatsIngestPayload): StatsIngestPayload {
    target.total.manualAdd += source.total.manualAdd;
    target.total.manualDelete += source.total.manualDelete;
    target.total.assistedAdd += source.total.assistedAdd;
    target.total.assistedDelete += source.total.assistedDelete;
    target.total.bulkAdd += source.total.bulkAdd;
    target.total.bulkDelete += source.total.bulkDelete;
    target.total.time += source.total.time;

    mergeCounterMaps(target.byLanguage, source.byLanguage);
    mergeCounterMaps(target.byProject, source.byProject);

    return target;
}

function clonePendingByDay(map: PendingByDay): PendingByDay {
    return Object.fromEntries(
        Object.entries(map).map(([date, payload]) => [date, clonePayload(payload)])
    );
}

export class StatsQueue {
    private readonly context: vscode.ExtensionContext;
    private pendingByDay: PendingByDay = {};

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.pendingByDay = this.readLatest();
    }

    public getAll(): PendingStatistic[] {
        this.pendingByDay = this.readLatest();
        return Object.keys(this.pendingByDay)
            .sort((a, b) => a.localeCompare(b))
            .map(date => ({
                id: date,
                createdAt: date,
                payload: clonePayload(this.pendingByDay[date]),
            }));
    }

    public async enqueue(payload: StatsIngestPayload): Promise<void> {
        const latest = this.readLatest();
        const dayKey = payload.date;
        if (!latest[dayKey]) {
            latest[dayKey] = clonePayload(payload);
        } else {
            latest[dayKey] = mergePayload(latest[dayKey], payload);
        }

        this.pendingByDay = latest;
        await this.persist(latest);
    }

    public async removeById(id: string): Promise<void> {
        const latest = this.readLatest();
        delete latest[id];

        this.pendingByDay = latest;
        await this.persist(latest);
    }

    public size(): number {
        this.pendingByDay = this.readLatest();
        return Object.keys(this.pendingByDay).length;
    }

    private readLatest(): PendingByDay {
        const latest = this.context.globalState.get<PendingByDay>(PENDING_STATS_BY_DAY_KEY, {});
        return clonePendingByDay(latest);
    }

    private async persist(pendingByDay: PendingByDay): Promise<void> {
        await this.context.globalState.update(PENDING_STATS_BY_DAY_KEY, clonePendingByDay(pendingByDay));
    }
}
