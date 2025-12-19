import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, extractApiKeyFromHeader } from './api-keys';
import { prisma } from './db';

export interface AuthenticatedRequest {
    userId: string;
    settings: {
        accessToken: string;
        phoneNumberId: string;
        businessAccountId: string;
        apiVersion: string;
    };
}

/**
 * Middleware to authenticate API requests using API keys
 * Returns the authenticated user and their settings
 */
export async function authenticateApiRequest(
    request: NextRequest
): Promise<{ success: true; data: AuthenticatedRequest } | { success: false; response: NextResponse }> {
    try {
        // Extract API key from Authorization header
        const authHeader = request.headers.get('authorization');
        const apiKey = extractApiKeyFromHeader(authHeader);

        if (!apiKey) {
            return {
                success: false,
                response: NextResponse.json(
                    {
                        success: false,
                        error: 'Unauthorized',
                        message: 'Missing or invalid API key. Please provide a valid API key in the Authorization header as "Bearer <your-api-key>"'
                    },
                    { status: 401 }
                )
            };
        }

        // Verify the API key
        const verification = await verifyApiKey(apiKey);

        if (!verification || !verification.isValid) {
            return {
                success: false,
                response: NextResponse.json(
                    {
                        success: false,
                        error: 'Unauthorized',
                        message: 'Invalid or inactive API key. Please check your API key and try again.'
                    },
                    { status: 401 }
                )
            };
        }

        // Get user's WhatsApp settings
        const settings = await prisma.userSettings.findUnique({
            where: { id: verification.userId },
            select: {
                accessToken: true,
                phoneNumberId: true,
                businessAccountId: true,
                apiVersion: true,
                accessTokenAdded: true
            }
        });

        if (!settings || !settings.accessTokenAdded || !settings.accessToken || !settings.businessAccountId) {
            return {
                success: false,
                response: NextResponse.json(
                    {
                        success: false,
                        error: 'Configuration Error',
                        message: 'WhatsApp credentials not configured. Please complete setup in the settings page.'
                    },
                    { status: 400 }
                )
            };
        }

        return {
            success: true,
            data: {
                userId: verification.userId,
                settings: {
                    accessToken: settings.accessToken,
                    phoneNumberId: settings.phoneNumberId || '',
                    businessAccountId: settings.businessAccountId,
                    apiVersion: settings.apiVersion || 'v23.0'
                }
            }
        };
    } catch (error) {
        console.error('Error in API authentication middleware:', error);
        return {
            success: false,
            response: NextResponse.json(
                {
                    success: false,
                    error: 'Internal Server Error',
                    message: 'An error occurred while authenticating your request.'
                },
                { status: 500 }
            )
        };
    }
}

/**
 * Helper function to create standardized error responses
 */
export function createErrorResponse(
    message: string,
    statusCode: number = 400,
    errorCode?: string
): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: errorCode || 'Error',
            message,
            timestamp: new Date().toISOString()
        },
        { status: statusCode }
    );
}

/**
 * Helper function to create standardized success responses
 */
export function createSuccessResponse<T>(
    data: T,
    message?: string,
    statusCode: number = 200
): NextResponse {
    return NextResponse.json(
        {
            success: true,
            ...(message && { message }),
            data,
            timestamp: new Date().toISOString()
        },
        { status: statusCode }
    );
}
