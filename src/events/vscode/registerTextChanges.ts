import * as vscode from 'vscode';
import { getLanguage } from '../../utils/data/getLanguage';
import { getProject } from '../../utils/data/getProject';
import { StatsState } from '../../types';
import { updateCounters } from '../../utils/updateCounters';
import { LanguageBlacklistService } from '../../service/LanguageBlacklistService';

export function registerTextChanges(
    context: vscode.ExtensionContext,
    getLanguageBlacklistService: () => LanguageBlacklistService | undefined,
    getAccessToken: () => string | null,
) {
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.contentChanges.length === 0) return;

            const stats = context.workspaceState.get<StatsState>('stats');
            if (!stats) {
                //console.log('text.change.skipped.noStats');
                return;
            }

            if (stats.ignoreChanges) {
                stats.ignoreChanges = false;
                context.workspaceState.update('stats', stats);
                //console.log('text.change.ignored');
                return;
            }

            const document = event.document;
            const language = getLanguage(document);
            const projectId = getProject(document);
            const languageBlacklistService = getLanguageBlacklistService();

            if (languageBlacklistService) {
                languageBlacklistService.maybeRefresh(getAccessToken());
                if (languageBlacklistService.isBlocked(language)) {
                    return;
                }
            }

            //console.log('text.change.received', {
            // document: document.uri.toString(),
            //     language,
            //     projectId,
            //     changes: event.contentChanges.length,
            //         isActiveEditorDocument: vscode.window.activeTextEditor?.document.uri.toString() === document.uri.toString(),
            //             windowState: stats.windowState,
            //                 activeContextLanguage: stats.activeContext.language ?? null,
            //                     activeContextProjectId: stats.activeContext.projectId ?? null,
            //                         activeContextAgeMs: now - stats.activeContext.since,
            // });

            for (const change of event.contentChanges) {
                const addedLines = change.text.split('\n').length - 1;
                const removedLines = change.range.end.line - change.range.start.line;
                const totalLinesTouched = addedLines + removedLines;
                const addedChars = change.text.length;
                const removedChars = change.rangeLength;
                const totalCharsTouched = addedChars + removedChars;

                const isBulk = totalLinesTouched > 5 || totalCharsTouched > 200;
                const isAssisted = (totalLinesTouched > 1 || totalCharsTouched > 50) && !isBulk;

                updateCounters(stats, {
                    language,
                    projectId,
                    isBulk,
                    isAssisted,
                    addedLines,
                    removedLines,
                });
            }

            context.workspaceState.update('stats', stats);
        })
    );
}
