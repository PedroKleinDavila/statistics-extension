import { api } from "./api";

export async function putStats(
    email: string,
    machineId: string,
    linesWritten: number,
    lettersWritten: number,
    totalTime: number,
    filesCreated: number
) {
    try {
        const body = {
            linesWritten,
            lettersWritten,
            timeSpent: totalTime,
            filesCreated,
        };
        const basicAuthToken = Buffer.from(`${email}:${machineId}`).toString("base64");

        const response = await api.put("/session-stat", body, {
            headers: {
                Authorization: `Basic ${basicAuthToken}`,
            },
        });

        if (response.status === 200) {
            console.log("Estatísticas enviadas com sucesso!");
        } else {
            console.error("Erro ao enviar estatísticas:", response.statusText);
        }
    } catch (error) {
        console.error("Erro ao enviar estatísticas:", error);
    }
}