import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { generateApiKey, hashApiKey, maskApiKey, getPartialKey, decryptApiKey } from '@/lib/api-keys';
import { checkFeatureAccess, checkSubscriptionActive } from '@/lib/plan-limits';

/**
 * GET - List all API keys for the authenticated user OR reveal a specific key
 */
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to view API keys' } },
                { status: 401 }
            );
        }

        // Check if user's plan allows API access
        const hasApiAccess = await checkFeatureAccess(userId, 'apiAccess');
        if (!hasApiAccess) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'FEATURE_UNAVAILABLE',
                        message: 'API access is not available on your current plan. Upgrade to Silver or Gold to use API keys.',
                    },
                    timestamp: new Date().toISOString()
                },
                { status: 403 }
            );
        }

        // Check if subscription is active
        const subCheck = await checkSubscriptionActive(userId);
        if (!subCheck.active) {
            return NextResponse.json(
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
            );
        }

        const { searchParams } = new URL(request.url);
        const revealId = searchParams.get('reveal');

        // If reveal parameter is present, return the decrypted API key
        if (revealId) {
            const apiKey = await prisma.apiKey.findFirst({
                where: { id: revealId, userId },
                select: {
                    id: true,
                    encryptedKey: true,
                    isActive: true,
                }
            });

            if (!apiKey) {
                return NextResponse.json(
                    { success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } },
                    { status: 404 }
                );
            }

            if (!apiKey.isActive) {
                return NextResponse.json(
                    { success: false, error: { code: 'KEY_REVOKED', message: 'This API key has been revoked' } },
                    { status: 403 }
                );
            }

            if (!apiKey.encryptedKey) {
                return NextResponse.json(
                    { success: false, error: { code: 'KEY_UNAVAILABLE', message: 'This API key was created before encryption was enabled. Please create a new API key.' } },
                    { status: 400 }
                );
            }

            // Decrypt and return the full key
            try {
                const fullKey = decryptApiKey(apiKey.encryptedKey);

                return NextResponse.json({
                    success: true,
                    message: 'API key revealed',
                    data: { key: fullKey },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error decrypting API key:', error);
                return NextResponse.json(
                    { success: false, error: { code: 'DECRYPTION_ERROR', message: 'Failed to decrypt API key. Please create a new one.' } },
                    { status: 500 }
                );
            }
        }

        // Otherwise, list all API keys
        const apiKeys = await prisma.apiKey.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                prefix: true,
                lastUsed: true,
                createdAt: true,
                updatedAt: true,
                isActive: true,
                key: true, // We'll use this to show partial key
            }
        });

        // Transform data to show partial keys instead of full hashed keys
        const transformedKeys = apiKeys.map(apiKey => ({
            id: apiKey.id,
            name: apiKey.name,
            partial_key: `${apiKey.prefix}${getPartialKey(apiKey.key)}`, // Show prefix + first 4 chars
            last_used: apiKey.lastUsed,
            created_at: apiKey.createdAt,
            updated_at: apiKey.updatedAt,
            is_active: apiKey.isActive,
        }));

        return NextResponse.json({
            success: true,
            data: transformedKeys,
            total: transformedKeys.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to fetch API keys'
                }
            },
            { status: 500 }
        );
    }
}

/**
 * POST - Create a new API key
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to create API keys' } },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name } = body;

        // Validate name
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'API key name is required' } },
                { status: 400 }
            );
        }

        if (name.length > 100) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'API key name must be 100 characters or less' } },
                { status: 400 }
            );
        }

        // Check if user has API access enabled
        const hasApiAccess = await checkFeatureAccess(userId, 'apiAccess');
        if (!hasApiAccess) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'FEATURE_UNAVAILABLE',
                        message: 'API access is not available on your current plan. Upgrade to Silver or Gold to use API keys.',
                    },
                    timestamp: new Date().toISOString()
                },
                { status: 403 }
            );
        }

        // Check if subscription is active
        const subCheck = await checkSubscriptionActive(userId);
        if (!subCheck.active) {
            return NextResponse.json(
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
            );
        }

        // Check if user exists, create if not
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
            },
        });

        // Generate new API key
        const { key, prefix, hashedKey, encryptedKey } = generateApiKey();

        // Create API key in database
        const apiKey = await prisma.apiKey.create({
            data: {
                userId,
                name: name.trim(),
                key: hashedKey,
                encryptedKey: encryptedKey,
                prefix,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                prefix: true,
                createdAt: true,
                isActive: true,
            }
        });

        return NextResponse.json({
            success: true,
            message: 'API key created successfully',
            data: {
                id: apiKey.id,
                name: apiKey.name,
                key: key, // Return the actual key ONLY on creation
                prefix: apiKey.prefix,
                created_at: apiKey.createdAt,
                is_active: apiKey.isActive,
            },
            warning: 'Please save this API key securely. You will not be able to see it again.',
            timestamp: new Date().toISOString()
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating API key:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to create API key'
                }
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH - Update an API key (rename only)
 */
export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to update API keys' } },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { id, name } = body;

        // Validate inputs
        if (!id) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'API key ID is required' } },
                { status: 400 }
            );
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'API key name is required' } },
                { status: 400 }
            );
        }

        if (name.length > 100) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'API key name must be 100 characters or less' } },
                { status: 400 }
            );
        }

        // Verify the API key belongs to the user
        const existingKey = await prisma.apiKey.findFirst({
            where: { id, userId }
        });

        if (!existingKey) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'API key not found or you do not have permission to update it' } },
                { status: 404 }
            );
        }

        // Update the API key name
        const updatedKey = await prisma.apiKey.update({
            where: { id },
            data: {
                name: name.trim(),
                updatedAt: new Date(),
            },
            select: {
                id: true,
                name: true,
                prefix: true,
                lastUsed: true,
                createdAt: true,
                updatedAt: true,
                isActive: true,
            }
        });

        return NextResponse.json({
            success: true,
            message: 'API key updated successfully',
            data: {
                id: updatedKey.id,
                name: updatedKey.name,
                prefix: updatedKey.prefix,
                last_used: updatedKey.lastUsed,
                created_at: updatedKey.createdAt,
                updated_at: updatedKey.updatedAt,
                is_active: updatedKey.isActive,
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating API key:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to update API key'
                }
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Revoke (delete) an API key
 */
export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to delete API keys' } },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'API key ID is required' } },
                { status: 400 }
            );
        }

        // Verify the API key belongs to the user
        const existingKey = await prisma.apiKey.findFirst({
            where: { id, userId }
        });

        if (!existingKey) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'API key not found or you do not have permission to delete it' } },
                { status: 404 }
            );
        }

        // Delete the API key
        await prisma.apiKey.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: 'API key revoked successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error deleting API key:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to delete API key'
                }
            },
            { status: 500 }
        );
    }
}
