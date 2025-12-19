import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { prisma } from './db';

// Encryption key - should be 32 bytes for AES-256
// In production, use a strong secret from environment variable
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'default-32-char-secret-key!!!';
const ALGORITHM = 'aes-256-cbc';

/**
 * Get encryption key buffer (32 bytes for AES-256)
 */
function getEncryptionKey(): Buffer {
    return createHash('sha256').update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt an API key for storage
 * Returns format: iv:encryptedData
 */
export function encryptApiKey(apiKey: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an API key
 * Expects format: iv:encryptedData
 */
export function decryptApiKey(encryptedKey: string): string {
    const key = getEncryptionKey();
    const [ivHex, encryptedData] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Generate a secure API key with prefix
 * Format: wc_live_<random_string>
 */
export function generateApiKey(): { key: string; prefix: string; hashedKey: string; encryptedKey: string } {
    const randomString = randomBytes(32).toString('hex');
    const key = `wc_live_${randomString}`;
    const prefix = key.substring(0, 8); // "wc_live_"
    const hashedKey = hashApiKey(key);
    const encryptedKey = encryptApiKey(key);

    return { key, prefix, hashedKey, encryptedKey };
}

/**
 * Hash an API key for secure storage
 * Uses SHA-256 for hashing
 */
export function hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

/**
 * Verify an API key and return the associated user
 * Also updates the lastUsed timestamp
 */
export async function verifyApiKey(key: string): Promise<{ userId: string; isValid: boolean } | null> {
    try {
        if (!key || !key.startsWith('wc_live_')) {
            return null;
        }

        const hashedKey = hashApiKey(key);

        // Find the API key in database
        const apiKey = await prisma.apiKey.findUnique({
            where: { key: hashedKey },
            select: {
                id: true,
                userId: true,
                isActive: true,
            }
        });

        if (!apiKey || !apiKey.isActive) {
            return null;
        }

        // Update last used timestamp asynchronously (don't wait)
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsed: new Date() }
        }).catch(err => {
            console.error('Failed to update lastUsed for API key:', err);
        });

        return {
            userId: apiKey.userId,
            isValid: true
        };
    } catch (error) {
        console.error('Error verifying API key:', error);
        return null;
    }
}

/**
 * Extract API key from Authorization header
 * Supports: "Bearer <key>" format
 */
export function extractApiKeyFromHeader(authHeader: string | null): string | null {
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Mask an API key for display purposes
 * Shows first 12 characters and last 4 characters
 * Example: wc_live_abc1...xyz9
 */
export function maskApiKey(key: string): string {
    if (key.length <= 16) {
        return key;
    }

    const start = key.substring(0, 12);
    const end = key.substring(key.length - 4);

    return `${start}...${end}`;
}

/**
 * Get partial API key for display (first 4 chars after prefix)
 * Example: For "wc_live_abc123def456", returns "abc1"
 */
export function getPartialKey(key: string): string {
    if (!key.startsWith('wc_live_')) {
        return key.substring(0, 4);
    }

    // Return first 4 chars after "wc_live_" prefix
    const afterPrefix = key.substring(8);
    return afterPrefix.substring(0, 4);
}
