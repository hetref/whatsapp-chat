import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, extractApiKeyFromHeader } from './api-keys';
import { prisma } from './prisma';
import { checkFeatureAccess, checkSubscriptionActive } from './plan-limits';

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
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Missing or invalid API key. Provide a valid API key in the Authorization header as "Bearer <your-api-key>".',
                        },
                        timestamp: new Date().toISOString()
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
                        error: {
                            code: 'INVALID_API_KEY',
                            message: 'Invalid or inactive API key. Please check your API key and try again.',
                        },
                        timestamp: new Date().toISOString()
                    },
                    { status: 401 }
                )
            };
        }

        // Check if user's plan allows API access
        const hasApiAccess = await checkFeatureAccess(verification.userId, 'apiAccess');
        if (!hasApiAccess) {
            return {
                success: false,
                response: NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'FEATURE_UNAVAILABLE',
                            message: 'API access is not available on your current plan. Upgrade to Silver or Gold.',
                        },
                        timestamp: new Date().toISOString()
                    },
                    { status: 403 }
                )
            };
        }

        // Check if subscription is active (not paused/expired/cancelled)
        const subCheck = await checkSubscriptionActive(verification.userId);
        if (!subCheck.active) {
            return {
                success: false,
                response: NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'SUBSCRIPTION_INACTIVE',
                            message: subCheck.message,
                            subscription_status: subCheck.status,
                            plan_tier: subCheck.planTier,
                        },
                        timestamp: new Date().toISOString()
                    },
                    { status: 403 }
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
                        error: {
                            code: 'CONFIGURATION_ERROR',
                            message: 'WhatsApp credentials not configured. Please complete setup in the dashboard settings page.',
                        },
                        timestamp: new Date().toISOString()
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
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: 'An error occurred while authenticating your request.',
                    },
                    timestamp: new Date().toISOString()
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
            error: {
                code: errorCode || 'ERROR',
                message,
            },
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
