import * as vscode from 'vscode';
import { getLanguage } from '../utils/getLanguage';
import { getProject } from '../utils/getProject';
import { StatsState } from '../types';
import { updateCounters } from '../utils/updateCounters';

export function registerTextChanges(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.contentChanges.length === 0) return;
            const stats = context.workspaceState.get<StatsState>('stats');
            if (!stats) return;
            if (stats.ignoreChanges) {
                stats.ignoreChanges = false;
                context.workspaceState.update('stats', stats);
                return;
            }

            const document = event.document;
            const language = getLanguage(document);
            const projectId = getProject(document);

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
