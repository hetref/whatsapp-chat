import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createSuccessResponse } from '@/lib/api-middleware';

/**
 * GET - Check API status and template analytics
 * Authentication: API Key (Bearer token)
 */
export async function GET(request: NextRequest) {
    try {
        // Authenticate the request
        const authResult = await authenticateApiRequest(request);
        if (!authResult.success) {
            return authResult.response;
        }

        const { userId, settings } = authResult.data;

        console.log('[WC API] Checking status for user:', userId);

        // Fetch all templates to get statistics
        const apiUrl = `https://graph.facebook.com/${settings.apiVersion}/${settings.businessAccountId}/message_templates?fields=status&limit=1000`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        let stats = {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            paused: 0,
            disabled: 0,
        };

        if (response.ok) {
            const data = await response.json();
            const templates = data.data || [];

            stats.total = templates.length;

            templates.forEach((template: { status: string }) => {
                const status = template.status?.toUpperCase();
                switch (status) {
                    case 'APPROVED':
                        stats.approved++;
                        break;
                    case 'PENDING':
                        stats.pending++;
                        break;
                    case 'REJECTED':
                        stats.rejected++;
                        break;
                    case 'PAUSED':
                        stats.paused++;
                        break;
                    case 'DISABLED':
                        stats.disabled++;
                        break;
                }
            });
        }

        return createSuccessResponse({
            status: 'operational',
            api_version: settings.apiVersion,
            configured: true,
            business_account_id: settings.businessAccountId,
            templates: stats,
            capabilities: {
                create_template: true,
                list_templates: true,
                get_template: true,
                delete_template: true,
                check_status: true,
            }
        });

    } catch (error: unknown) {
        console.error('[WC API] Error checking status:', error);

        // Return partial status even on error
        return createSuccessResponse({
            status: 'operational',
            configured: true,
            error: error instanceof Error ? error.message : 'Failed to fetch detailed statistics',
            capabilities: {
                create_template: true,
                list_templates: true,
                get_template: true,
                delete_template: true,
                check_status: true,
            }
        });
    }
}
