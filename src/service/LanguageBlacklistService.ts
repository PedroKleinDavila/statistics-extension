import * as vscode from 'vscode';

const LANGUAGE_BLACKLIST_CACHE_KEY = 'languageBlacklistCache';
const BLACKLIST_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

type LanguageBlacklistCache = {
    languages: string[];
    updatedAt: number;
};

type LanguageBlacklistApiResponse = {
    languages?: string[];
};

const FALLBACK_LANGUAGE_BLACKLIST = [
    "markdown",
    "md",
    "plaintext",
    "text",
    "log",
    "logs",
    "json",
    "jsonc",
    "yaml",
    "yml",
    "xml",
    "csv",
    "tsv",
    "toml",
    "ini",
    "cfg",
    "conf",
    "config",
    "properties",
    "dotenv",
    "env",
    "lock",
    "package-lock",
    "yarn-lock",
    "pnpm-lock",
    "cargo-lock",
    "composer-lock",
    "dockerfile",
    "dockercompose",
    "docker-compose",
    "github-actions-workflow",
    "gitlab-ci",
    "azure-pipelines",
    "gitignore",
    "ignore",
    "gitattributes",
    "gitmodules",
    "scminput",
    "makefile",
    "cmake",
    "gradle",
    "maven",
    "terraform",
    "hcl",
    "kubernetes",
    "editorconfig",
    "vscode-settings",
    "vscode-tasks",
    "vscode-launch",
    "restructuredtext",
    "asciidoc",
    "plist",
    "desktop",
    "service",
    "systemd",
    "pem",
    "cert",
    "crt",
    "bat",
    "chatagent",
    "code-runner-output",
    "git-commit",
    "powershell",
    "shellscript",
    "skill",
    "jsonl",
    "debian-control.r",
    "latex",
    "bibtex",
    "code-text-binary",
    "csv (semicolon)",
    "dbclient-log",
    "diff",
    "go-mod",
    "http",
    "java-properties",
    "latex_workshop_log",
    "pip-requirements",
    "search-result",
    "spring-boot-properties",
    "spring-boot-properties-yaml",
    "xaml"
] as const;

function normalizeLanguage(value: string): string {
    return value.trim().toLowerCase();
}

function toNormalizedSet(values: Iterable<string>): Set<string> {
    return new Set(
        Array.from(values)
            .map(normalizeLanguage)
            .filter(value => value.length > 0)
    );
}

export class LanguageBlacklistService {
    private readonly context: vscode.ExtensionContext;
    private readonly apiBaseUrl: string;

    private languages: Set<string> = toNormalizedSet(FALLBACK_LANGUAGE_BLACKLIST);
    private refreshInFlight?: Promise<void>;
    private lastRefreshAttempt = 0;

    constructor(context: vscode.ExtensionContext, apiBaseUrl: string) {
        this.context = context;
        this.apiBaseUrl = apiBaseUrl;

        const cached = this.context.workspaceState.get<LanguageBlacklistCache>(LANGUAGE_BLACKLIST_CACHE_KEY);
        if (cached?.languages?.length) {
            this.languages = toNormalizedSet(cached.languages);
            this.lastRefreshAttempt = cached.updatedAt ?? 0;
        }
    }

    public isBlocked(language: string | undefined): boolean {
        if (!language) {
            return false;
        }

        return this.languages.has(normalizeLanguage(language));
    }

    public maybeRefresh(accessToken: string | null): void {
        const now = Date.now();
        if (!accessToken || this.refreshInFlight || now - this.lastRefreshAttempt < BLACKLIST_REFRESH_INTERVAL_MS) {
            return;
        }

        this.lastRefreshAttempt = now;
        this.refreshInFlight = this.refresh(accessToken)
            .catch(error => {
                console.error('Failed to refresh language blacklist:', error);
            })
            .finally(() => {
                this.refreshInFlight = undefined;
            });
    }

    public async refresh(accessToken: string | null): Promise<void> {
        if (!accessToken) {
            return;
        }

        this.lastRefreshAttempt = Date.now();

        const response = await fetch(`${this.apiBaseUrl}/stats/languages/blacklist`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Blacklist request failed with status ${response.status}`);
        }

        const payload = await response.json() as LanguageBlacklistApiResponse;
        const backendLanguages = Array.isArray(payload?.languages) ? payload.languages : [];
        if (backendLanguages.length === 0) {
            return;
        }

        this.languages = toNormalizedSet(backendLanguages);

        await this.context.workspaceState.update(LANGUAGE_BLACKLIST_CACHE_KEY, {
            languages: Array.from(this.languages),
            updatedAt: Date.now(),
        } satisfies LanguageBlacklistCache);
    }
}
