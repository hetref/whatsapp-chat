// Global window type extensions
declare global {
    interface Window {
        mediaRefreshErrorCount?: { [messageId: string]: number };
    }
}

// SessionStorage media cache entry
interface CachedMediaUrl {
    url: string;
    expiresAt: number; // Unix timestamp in ms
}

export { CachedMediaUrl };