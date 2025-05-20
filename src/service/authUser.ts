import { api } from "./api";

export async function authUser(email: string, machineId: string) {
    try {
        const response = await api.get(`user/${email}/auth/${machineId}`);
        if (response.status === 200) {
            return response.data;
        } else {
            console.error("Login failed:", response.statusText);
            return null;
        }
    } catch (error) {
        console.error("Error during login:", error);
        if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
            return "User not found";
        }
        return null;
    }
}