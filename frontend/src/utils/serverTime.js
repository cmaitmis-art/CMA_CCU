const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();

// Keep track of the offset between the client clock and the server clock
let serverTimeOffset = 0;

/**
 * Fetches the server time and calculates the offset from the local client time.
 * Should be called once during app initialization.
 */
export async function syncServerTime() {
    try {
        const response = await fetch(`${API_BASE}/server-time`);
        if (response.ok) {
            const data = await response.json();
            const serverTimeMs = new Date(data.serverTime).getTime();
            const localTimeMs = Date.now();
            serverTimeOffset = serverTimeMs - localTimeMs;
        }
    } catch (e) {
        console.warn('Failed to sync server time, falling back to local client time.', e);
        serverTimeOffset = 0;
    }
}

/**
 * Returns a new Date object representing the current server time,
 * adjusted by the calculated offset.
 * Use this instead of `new Date()` when the date/year is critical for business logic.
 */
export function getServerDate() {
    return new Date(Date.now() + serverTimeOffset);
}
