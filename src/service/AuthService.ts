import * as vscode from 'vscode';
import { ExtensionIdentity, ExtensionLoginSuccess } from '../types';

const LOGIN_RETRY_INTERVAL_MS = 60_000;
const FRONTEND_LINK_URL = 'https://codingstats.me/link-account';

type LoginNotFound = {
    code?: string;
};

type AuthCallbacks = {
    onAuthenticated: (session: ExtensionLoginSuccess) => void | Promise<void>;
};

export class AuthService {
    private readonly apiBaseUrl: string;
    private readonly identity: ExtensionIdentity;
    private readonly callbacks: AuthCallbacks;

    private retryInterval?: NodeJS.Timeout;
    private loginInFlight = false;
    private openedLinkFlow = false;
    private session: ExtensionLoginSuccess | null = null;

    constructor(apiBaseUrl: string, identity: ExtensionIdentity, callbacks: AuthCallbacks) {
        this.apiBaseUrl = apiBaseUrl;
        this.identity = identity;
        this.callbacks = callbacks;
    }

    public start() {
        void this.tryLogin();
        if (!this.retryInterval) {
            this.retryInterval = setInterval(() => {
                void this.tryLogin();
            }, LOGIN_RETRY_INTERVAL_MS);
        }
    }

    public stop() {
        if (this.retryInterval) {
            clearInterval(this.retryInterval);
            this.retryInterval = undefined;
        }
    }

    public isAuthenticated(): boolean {
        return this.session !== null;
    }

    public getAccessToken(): string | null {
        return this.session?.accessToken ?? null;
    }

    public invalidateSession() {
        this.session = null;
        this.start();
    }

    private async tryLogin() {
        if (this.loginInFlight || this.session) {
            return;
        }

        this.loginInFlight = true;
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login-extension`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.identity),
            });

            if (response.ok) {
                const session = await response.json() as ExtensionLoginSuccess;
                if (!session.accessToken || !session.userId || !session.email) {
                    throw new Error('Invalid login response from backend.');
                }

                this.session = session;
                this.stop();
                await this.callbacks.onAuthenticated(session);
                return;
            }

            if (response.status === 404) {
                const payload = await response.json() as LoginNotFound;
                if ((payload.code === 'USER_NOT_FOUND' || !payload.code) && !this.openedLinkFlow) {
                    this.openedLinkFlow = true;
                    const linkUrl = `${FRONTEND_LINK_URL}?githubEmail=${encodeURIComponent(this.identity.githubEmail)}&machineId=${encodeURIComponent(this.identity.machineId)}`;
                    void vscode.env.openExternal(vscode.Uri.parse(linkUrl));
                }
                return;
            }

            if (response.status < 500) {
                const body = await response.text();
                console.error(`Extension login failed (${response.status}): ${body}`);
            }
        } catch (error) {
            console.error('Extension login request failed:', error);
        } finally {
            this.loginInFlight = false;
        }
    }
}
