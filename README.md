# Coding Statistics VS Code Extension

Coding Statistics is a VS Code extension that tracks your coding activity in real time and syncs it to the CodingStats platform.

This README reflects the current production architecture across all related repositories:

- `statistics-extension` (VS Code extension)
- `statistics-extension-backend-2` (.NET API + persistence)
- `statistics-extension-frontend-2` (web dashboard and account flows)

## What The Extension Tracks

The extension captures, per language and per project:

- Coding time (active editor time only)
- Manual edits (`manualAdd`, `manualDelete`)
- Assisted edits (`assistedAdd`, `assistedDelete`)
- Bulk edits (`bulkAdd`, `bulkDelete`)

Edit classification logic:

- `bulk`: more than 5 lines touched OR more than 200 chars touched
- `assisted`: more than 1 line touched OR more than 50 chars touched (when not bulk)
- `manual`: everything else

## End-to-End Flow (Extension -> Backend -> Frontend)

1. On startup, extension initializes local state and detects:
   - GitHub primary verified email (VS Code GitHub auth)
   - `vscode.env.machineId`
2. Extension calls `POST /auth/login-extension`.
3. If backend returns `USER_NOT_FOUND` (404), extension opens:
   - `https://codingstats.me/link-account?githubEmail=...&machineId=...`
4. User logs in/registers in frontend and frontend calls `POST /auth/link-machine`.
5. Extension retries login every 60s until authenticated.
6. Extension tracks activity locally in workspace state.
7. Every 10 minutes, extension snapshots local counters and queues them.
8. Queue is sent to backend via `POST /stats` (JWT bearer token).
9. After upload, extension fetches merged daily server state via `GET /stats/{date}`.
10. Status bar shows live totals = local unsynced + latest synced daily totals.

## Reliability Model

- Local queue is persisted in `globalState` by day (`pendingStatisticsByDay`).
- Queue items from same day are merged (no duplicate daily payload spam).
- If auth expires (401), extension invalidates session and restarts extension login.
- If network/server fails, pending queue is kept and retried.
- On deactivate, extension forces a final sync cycle (`syncNow`).

## Status Bar

Main command:

- `Coding Statistics: Open CodingStats Dashboard`

Display modes (`codingstatistics.statusBar.mode`):

- `compact`
- `balanced`
- `deep`

Primary metric (`codingstatistics.statusBar.primaryMetric`):

- `time`
- `manualLines`
- `netLines`
- `assistedShare`
- `productivityScore`

Time format (`codingstatistics.statusBar.timeFormat`):

- `human`
- `hhmmss`
- `minutes`

Sync icons are dynamic (`check`, `sync~spin`, `cloud-offline`, `warning`, `pulse`) based on auth and pending queue status.

## Extension Settings

- `codingstatistics.apiUrl` (default: `https://api.codingstats.me`)
- `codingstatistics.statusBar.mode`
- `codingstatistics.statusBar.primaryMetric`
- `codingstatistics.statusBar.timeFormat`

## Recommended New Screenshots

Remove the old screenshot and replace with this set (recommended order for docs explanation):

1. `docs/images/01-status-bar-balanced.png`
   - VS Code status bar in `balanced` mode.
   - Show: total time, net/manual/AI/bulk summary.
2. `docs/images/02-status-bar-tooltip.png`
   - Hover tooltip expanded.
   - Show: Today totals, rates, current context, top languages/projects, sync status.
3. `docs/images/03-link-account-page.png`
   - Browser page `/link-account` with prefilled GitHub email.
   - Show: login/register tabs and extension connection message.
4. `docs/images/04-dashboard-overview.png`
   - Frontend dashboard with cards + heatmap + insights.
5. `docs/images/05-dashboard-languages-projects.png`
   - Language and project charts.
6. `docs/images/06-history-page.png`
   - Date range and table history.
7. `docs/images/07-global-ranking.png`
   - Global ranking page with filters and nearby rank card.

Tip for consistency: capture with same account/date range and blur any sensitive email/token/user ids.

## Setup

1. Configure Git email (used for extension identity):

```bash
git config user.email "your-email@example.com"
```

2. Install extension.
3. Open VS Code and start coding.
4. Click extension status bar item to open dashboard.

## Known Limitation

If GitHub email or machine ID is unavailable, data stays local until authentication can be completed.
