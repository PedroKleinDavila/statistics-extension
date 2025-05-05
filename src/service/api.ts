import axios from "axios";
import * as vscode from 'vscode';

export const api = axios.create({
    baseURL: vscode.workspace.getConfiguration('codingstatistics').get('apiUrl') ?? "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 5000,
});