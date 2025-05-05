import { api } from "./api";
import * as vscode from 'vscode';
export async function putStats(
    email: string,
    linesWritten: number,
    lettersWritten: number,
    totalTime: number,
    filesCreated: number
) {
    try {
        const body = {
            email,
            linesWritten,
            lettersWritten,
            timeSpent: totalTime,
            filesCreated,
        };
        const response = await api.put("/session-stat", body);

        if (response.status === 200) {
            console.log("Estatísticas enviadas com sucesso!");
        } else {
            console.error("Erro ao enviar estatísticas:", response.statusText);
        }
    } catch (error) {
        console.error("Erro ao enviar estatísticas:", error);
    }
}