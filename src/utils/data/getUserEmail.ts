import * as vscode from 'vscode';

export async function getUserEmail(): Promise<string | null> {
    try {
        const session = await vscode.authentication.getSession('github', ['user:email'], { createIfNone: true });
        const token = session.accessToken;

        const response = await fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user emails');
        }

        const emails = await response.json() as { email: string; primary: boolean; verified: boolean }[];
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        return primaryEmail?.email ?? null;
    } catch (error) {
        console.error('Failed to retrieve user email:', error);
        return null;
    }
}
